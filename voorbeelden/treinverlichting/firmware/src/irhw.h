// IR met de RMT van de ESP32-S3 (firmware 2.0.0): alleen de hardware; coderen, herkennen en leren zitten in
// include/ir.h (getest op de pc). Gebruikt de RMT-driver van ESP-IDF 4.4 die in Arduino-ESP32 2.0 zit.
//
//   zenden    RMT-kanaal 3 (TX) op GPIO47, tel van 1 µs, met draaggolf (30..56 kHz, duty 33 %, hoog = led aan) naar de
//             snelle MOSFET-module in de gemeenschappelijke retour van de IR-leds. Kanaal 0 houdt Arduino vrij voor het
//             statuslampje (neopixelWrite op GPIO38).
//   ontvangen RMT-kanalen 4..7 (RX) op GPIO48 (leerontvanger TSMP58000, met draaggolf), 11, 39 en 42 (TSOP38238 of een
//             fototransistor-module, gedemoduleerd). Alle ontvangers zijn actief laag. Tel van 0,5 µs (genoeg om de
//             draaggolf te meten), stoorfilter 1,25 µs, een frame eindigt na 12 ms zonder flank.
//             De leerontvanger geeft per periode van de draaggolf een puls: een NEC-frame is ± 2600 pulsen. Het kanaal
//             heeft maar 48 plaatsen in het RMT-geheugen; de driver schuift ze (ping-pong, SOC_RMT_SUPPORT_RX_PINGPONG)
//             naar een buffer van 24 kB. De andere ontvangers hebben genoeg aan 1 kB (NEC = 34 plaatsen).
#pragma once
#include <Arduino.h>
#include <driver/rmt.h>
#include <freertos/ringbuf.h>

#include "ir.h"

constexpr uint8_t PIN_IR_ZEND = 47;
constexpr uint8_t PIN_IR_ONTVANG[trein::IR_ONTVANGERS] = {48, 11, 39, 42};
constexpr rmt_channel_t IR_TX_KANAAL = RMT_CHANNEL_3;
constexpr rmt_channel_t IR_RX_KANAAL[trein::IR_ONTVANGERS] = {RMT_CHANNEL_4, RMT_CHANNEL_5, RMT_CHANNEL_6, RMT_CHANNEL_7};
constexpr size_t IR_RX_BUF_LEER = 24 * 1024, IR_RX_BUF = 1024;
constexpr uint32_t IR_RX_TEL_NS = 500;     // clk_div 40 bij 80 MHz
constexpr int IR_MAX_ITEMS = 700;          // zenden: genoeg voor irPulsen (MAX_IR_PULSEN tijden, lange pauzes gesplitst)
constexpr int IR_MAX_FRAME = 6000;         // ontvangen: tijden per frame (leerontvanger)

class IrHw {
 public:
  bool zendOk = false;
  bool ontvangOk[trein::IR_ONTVANGERS] = {false, false, false, false};

  void begin() {
    rmt_config_t t = RMT_DEFAULT_CONFIG_TX((gpio_num_t)PIN_IR_ZEND, IR_TX_KANAAL);
    t.clk_div = 80; // 1 µs
    t.mem_block_num = 1;
    t.tx_config.carrier_en = true;
    t.tx_config.carrier_freq_hz = 38000;
    t.tx_config.carrier_duty_percent = 33;
    t.tx_config.carrier_level = RMT_CARRIER_LEVEL_HIGH;
    t.tx_config.idle_output_en = true;
    t.tx_config.idle_level = RMT_IDLE_LEVEL_LOW;
    zendCfg_ = t;
    khz_ = 38;
    zendOk = rmt_config(&t) == ESP_OK && rmt_driver_install(IR_TX_KANAAL, 0, 0) == ESP_OK;
    for (int o = 0; o < trein::IR_ONTVANGERS; o++) {
      rmt_config_t r = RMT_DEFAULT_CONFIG_RX((gpio_num_t)PIN_IR_ONTVANG[o], IR_RX_KANAAL[o]);
      r.clk_div = 40; // 0,5 µs
      r.mem_block_num = 1;
      r.rx_config.filter_en = true;
      r.rx_config.filter_ticks_thresh = 100; // 1,25 µs bij 80 MHz
      r.rx_config.idle_threshold = 24000;    // 12 ms
      pinMode(PIN_IR_ONTVANG[o], INPUT_PULLUP); // een ontvanger die er niet is: rust (hoog)
      bool ok = rmt_config(&r) == ESP_OK &&
                rmt_driver_install(IR_RX_KANAAL[o], o == 0 ? IR_RX_BUF_LEER : IR_RX_BUF, 0) == ESP_OK &&
                rmt_get_ringbuf_handle(IR_RX_KANAAL[o], &rb_[o]) == ESP_OK && rb_[o] != nullptr &&
                rmt_rx_start(IR_RX_KANAAL[o], true) == ESP_OK;
      ontvangOk[o] = ok;
    }
    frame_ = (uint32_t *)ps_malloc(sizeof(uint32_t) * IR_MAX_FRAME);
    if (!frame_) frame_ = (uint32_t *)malloc(sizeof(uint32_t) * IR_MAX_FRAME);
  }

  /** is het vorige frame helemaal verzonden? */
  bool klaar() { return !bezig_ || rmt_wait_tx_done(IR_TX_KANAAL, 0) == ESP_OK; }

  /** een code zenden (niet wachten: de RMT doet het zelf; de items blijven in deze klasse tot het klaar is).
   *  false = nog bezig of de code is leeg */
  bool zend(const trein::IrCode &c) {
    if (!zendOk || !klaar()) return false;
    bezig_ = false;
    static uint32_t us[trein::MAX_IR_PULSEN];
    int n = trein::irPulsen(c, us, trein::MAX_IR_PULSEN, toggle_);
    toggle_ = !toggle_;
    if (n <= 0) return false;
    int k = 0;
    rmt_item32_t it = {};
    bool helft = false; // false: duration0 is aan de beurt
    for (int i = 0; i < n && k < IR_MAX_ITEMS; i++) {
      uint32_t rest = us[i];
      uint32_t niveau = (i % 2 == 0) ? 1 : 0;
      while (rest > 0 && k < IR_MAX_ITEMS) {
        uint32_t d = rest > 32767 ? 32767 : rest;
        rest -= d;
        if (!helft) { it.duration0 = d; it.level0 = niveau; helft = true; }
        else { it.duration1 = d; it.level1 = niveau; items_[k++] = it; it = {}; helft = false; }
      }
    }
    if (helft && k < IR_MAX_ITEMS) { it.duration1 = 0; it.level1 = 0; items_[k++] = it; }
    uint8_t khz = c.khz < trein::IR_KHZ_MIN ? 38 : (c.khz > trein::IR_KHZ_MAX ? 38 : c.khz);
    if (khz != khz_) {
      zendCfg_.tx_config.carrier_freq_hz = (uint32_t)khz * 1000u;
      rmt_config(&zendCfg_);
      khz_ = khz;
    }
    if (rmt_write_items(IR_TX_KANAAL, items_, k, false) != ESP_OK) return false;
    bezig_ = true;
    return true;
  }

  /** het volgende frame van ontvanger o (0..3), in ns, aan/uit om beurten, begint met aan; 0 = geen frame */
  int ontvang(int o, const uint32_t *&uit) {
    uit = frame_;
    if (!ontvangOk[o] || !frame_) return 0;
    size_t bytes = 0;
    rmt_item32_t *it = (rmt_item32_t *)xRingbufferReceive(rb_[o], &bytes, 0);
    if (!it) return 0;
    int n = 0;
    int vorigNiveau = -1;
    size_t aantal = bytes / sizeof(rmt_item32_t);
    for (size_t i = 0; i < aantal; i++) {
      for (int h = 0; h < 2; h++) {
        uint32_t d = h ? it[i].duration1 : it[i].duration0;
        int niveau = h ? it[i].level1 : it[i].level0;
        if (d == 0) { i = aantal; break; }
        int aan = niveau == 0; // actief laag: laag = licht ontvangen
        if (n == 0 && !aan) continue; // beginnen met aan
        if (aan == vorigNiveau && n > 0) { frame_[n - 1] += d * IR_RX_TEL_NS; continue; }
        if (n >= IR_MAX_FRAME) { i = aantal; break; }
        frame_[n++] = d * IR_RX_TEL_NS;
        vorigNiveau = aan;
      }
    }
    vRingbufferReturnItem(rb_[o], it);
    return n;
  }

 private:
  rmt_config_t zendCfg_;
  uint8_t khz_ = 38;
  bool bezig_ = false, toggle_ = false;
  rmt_item32_t items_[IR_MAX_ITEMS];
  RingbufHandle_t rb_[trein::IR_ONTVANGERS] = {nullptr, nullptr, nullptr, nullptr};
  uint32_t *frame_ = nullptr;
};
