// IR met de RMT van de ESP32-S3: alleen de hardware. Coderen, herkennen en leren zitten in include/ir.h, de RMT-items
// bouwen en lezen in include/irrmt.h, het zenden in stappen in include/irzend.h (alles getest op de pc). Gebruikt de
// RMT-driver van ESP-IDF 4.4 die in Arduino-ESP32 2.0 zit.
//
//   zenden    RMT-kanaal 1 (TX) op GPIO47 met 3 geheugenblokken (144 items; Fable 5.2 F8: een frame tot 144 items
//             wordt niet bijgevuld door een interrupt, die zou wachten zolang LittleFS schrijft; main.cpp bewaart niet
//             zolang er gezonden wordt). Kanaal 0 houdt Arduino vrij voor het statuslampje (neopixelWrite op GPIO38);
//             kanaal 2 en 3 kunnen niet meer (hun geheugen hoort bij kanaal 1). Tel van 1 µs, met draaggolf (30..56 kHz,
//             duty 33 of 50 %: instelling irDuty, E4), hoog = led aan, naar de MOSFET-module -Q3 in de gemeenschappelijke
//             retour van de IR-leds.
//             Continu (F1): de draaggolf uit en het rustniveau hoog: de gekozen leds branden zonder draaggolf.
//             AANNAME (niet in de documentatie van ESP-IDF 4.4 gevonden): met carrier_en = false en idle_level hoog
//             staat de pin vast hoog. Fallback als dat op TRN-20 niet zo blijkt: de pin loskoppelen van de RMT en
//             digitalWrite(47, HIGH).
//   ontvangen RMT-kanalen 4..7 (RX) op GPIO48 (leerontvanger TSMP58000 -B1, met draaggolf), 11, 39 en 42 (TSOP38238 of
//             een fototransistor-module, gedemoduleerd). Alle ontvangers zijn actief laag. Tel van 0,5 µs, stoorfilter
//             1,25 µs, een frame eindigt na 12 ms zonder flank.
//             De leerontvanger geeft per periode van de draaggolf een puls (NEC ± 1050 perioden = 1050 items). Het kanaal
//             heeft 48 plaatsen in het RMT-geheugen; de driver schuift ze (ping-pong) naar een ringbuffer van 48 kB in
//             PSRAM (F17: een item van de ringbuffer mag hoogstens de helft zijn, dus ± 6000 perioden). Wat langer is,
//             wordt afgekapt en gemeld ("code te lang").
//   niveau    E2: ESP-IDF 4.4 (RMT, idle_threshold): "The receiver will ignore pulses longer than this setting." Een
//             lichtsluis of reflexsensor die lang laag blijft, geeft dus geen frame. laag(o) leest daarom de pin zelf met
//             gpio_get_level (de RMT laat de pin een ingang van de GPIO-matrix; AANNAME: het niveau is dan leesbaar,
//             na te kijken op TRN-20 met een draadje naar GND op GPIO11; fallback: de reflexsensoren op ingang 17..23 van
//             de MCP23017, wat de README toch al aanraadt).
#pragma once
#include <Arduino.h>
#include <driver/gpio.h>
#include <driver/rmt.h>
#include <freertos/ringbuf.h>

#include "hw.h"
#include "irrmt.h"
#include "irzend.h"

constexpr uint8_t PIN_IR_ZEND = 47;
constexpr uint8_t PIN_IR_ONTVANG[trein::IR_ONTVANGERS] = {48, 11, 39, 42};
constexpr rmt_channel_t IR_TX_KANAAL = RMT_CHANNEL_1;
constexpr rmt_channel_t IR_RX_KANAAL[trein::IR_ONTVANGERS] = {RMT_CHANNEL_4, RMT_CHANNEL_5, RMT_CHANNEL_6, RMT_CHANNEL_7};
constexpr size_t IR_RX_BUF_LEER = 48 * 1024, IR_RX_BUF = 1024;
constexpr uint32_t IR_RX_TEL_NS = 500;     // clk_div 40 bij 80 MHz
constexpr int IR_MAX_FRAME = 12000;        // ontvangen: tijden per frame (leerontvanger: 6000 perioden)
static_assert(sizeof(trein::RmtItem) == sizeof(rmt_item32_t), "RmtItem moet even groot zijn als rmt_item32_t");

class IrHw {
 public:
  bool zendOk = false;
  bool ontvangOk[trein::IR_ONTVANGERS] = {false, false, false, false};

  void begin() {
    rmt_config_t t = RMT_DEFAULT_CONFIG_TX((gpio_num_t)PIN_IR_ZEND, IR_TX_KANAAL);
    t.clk_div = 80; // 1 µs
    t.mem_block_num = 3;
    t.tx_config.carrier_en = true;
    t.tx_config.carrier_freq_hz = 38000;
    t.tx_config.carrier_duty_percent = trein::IR_DUTY_STD;
    t.tx_config.carrier_level = RMT_CARRIER_LEVEL_HIGH;
    t.tx_config.idle_output_en = true;
    t.tx_config.idle_level = RMT_IDLE_LEVEL_LOW;
    zendCfg_ = t;
    khz_ = 38;
    duty_ = trein::IR_DUTY_STD;
    zendOk = rmt_config(&t) == ESP_OK && rmt_driver_install(IR_TX_KANAAL, 0, 0) == ESP_OK;
    for (int o = 0; o < trein::IR_ONTVANGERS; o++) {
      rmt_config_t r = RMT_DEFAULT_CONFIG_RX((gpio_num_t)PIN_IR_ONTVANG[o], IR_RX_KANAAL[o]);
      r.clk_div = 40; // 0,5 µs
      r.mem_block_num = 1;
      r.rx_config.filter_en = true;
      // Fable 5.2 E12: de gedemoduleerde ontvangers op de baan een ruimer stoorfilter (255 = 3,2 µs: pieken van de 38 kHz-
      // IR-leddraden in de ontvangerdraden); de leerontvanger 1,25 µs (hij geeft de draaggolfpulsen van ± 8,8 µs door)
      r.rx_config.filter_ticks_thresh = o == 0 ? 100 : 255;
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

  /** E4: duty van de draaggolf (33 of 50 %); geldt vanaf de volgende code */
  void zetDuty(uint8_t d) { duty_ = d == 50 ? 50 : 33; }

  /** is het vorige frame helemaal verzonden? */
  bool klaar() { return !bezig_ || rmt_wait_tx_done(IR_TX_KANAAL, 0) == ESP_OK; }

  /** een code zenden (niet wachten: de RMT doet het zelf; de items blijven in deze klasse tot het klaar is).
   *  false = nog bezig, leeg, of te lang (F5: dan niets, geen half frame) */
  bool zend(const trein::IrCode &c) {
    if (!zendOk || !klaar() || continu_) return false;
    bezig_ = false;
    static uint32_t us[trein::MAX_IR_PULSEN];
    int n = trein::irPulsen(c, us, trein::MAX_IR_PULSEN, toggle_);
    toggle_ = !toggle_;
    if (n <= 0) return false;
    int k = trein::irNaarItems(us, n, items_, trein::IR_MAX_ITEMS);
    if (k <= 0) return false;
    uint8_t khz = c.khz < trein::IR_KHZ_MIN ? 38 : (c.khz > trein::IR_KHZ_MAX ? 38 : c.khz);
    if (khz != khz_ || duty_ != zendCfg_.tx_config.carrier_duty_percent) {
      zendCfg_.tx_config.carrier_freq_hz = (uint32_t)khz * 1000u;
      zendCfg_.tx_config.carrier_duty_percent = duty_;
      rmt_config(&zendCfg_);
      khz_ = khz;
    }
    if (rmt_write_items(IR_TX_KANAAL, (const rmt_item32_t *)items_, k, false) != ESP_OK) return false;
    bezig_ = true;
    return true;
  }

  /** F1: de pin vast hoog zonder draaggolf (aan), of terug naar zenden met draaggolf (uit) */
  void continu(bool aan) {
    if (!zendOk || aan == continu_) return;
    continu_ = aan;
    if (aan) {
      rmt_set_tx_carrier(IR_TX_KANAAL, false, 0, 0, RMT_CARRIER_LEVEL_HIGH);
      rmt_set_idle_level(IR_TX_KANAAL, true, RMT_IDLE_LEVEL_HIGH);
    } else {
      rmt_set_idle_level(IR_TX_KANAAL, true, RMT_IDLE_LEVEL_LOW);
      rmt_config(&zendCfg_); // de draaggolf weer aan
    }
  }

  /** het volgende frame van ontvanger o (0..3), in ns, aan/uit om beurten, begint met aan; 0 = geen frame.
   *  afgekapt = langer dan IR_MAX_FRAME tijden (F17) */
  int ontvang(int o, const uint32_t *&uit, bool &afgekapt) {
    uit = frame_;
    afgekapt = false;
    if (!ontvangOk[o] || !frame_) return 0;
    size_t bytes = 0;
    void *it = xRingbufferReceive(rb_[o], &bytes, 0);
    if (!it) return 0;
    int n = trein::itemsNaarNs((const trein::RmtItem *)it, bytes / sizeof(rmt_item32_t), frame_, IR_MAX_FRAME,
                               IR_RX_TEL_NS, afgekapt);
    vRingbufferReturnItem(rb_[o], it);
    return n;
  }

  /** E2: is de pin van ontvanger o nu laag (licht, of een sensor die trekt)? */
  bool laag(int o) const { return gpio_get_level((gpio_num_t)PIN_IR_ONTVANG[o]) == 0; }

 private:
  rmt_config_t zendCfg_;
  uint8_t khz_ = 38, duty_ = trein::IR_DUTY_STD;
  bool bezig_ = false, toggle_ = false, continu_ = false;
  trein::RmtItem items_[trein::IR_MAX_ITEMS];
  RingbufHandle_t rb_[trein::IR_ONTVANGERS] = {nullptr, nullptr, nullptr, nullptr};
  uint32_t *frame_ = nullptr;
};

/** IrZendHw voor de IrZender (include/irzend.h): de leds via de MCP23017, de pulsen via de RMT */
class IrZendEsp : public trein::IrZendHw {
 public:
  IrZendEsp(IrHw &ir, Mcp23017 &mcp, volatile bool &mcpOk) : ir_(ir), mcp_(mcp), mcpOk_(mcpOk) {}
  bool kiesLeds(uint8_t leds) override {
    if (!mcpOk_) return false;
    if (!mcp_.zetA(leds)) { mcpOk_ = false; return false; }
    return true;
  }
  bool zend(const trein::IrCode &c) override { return ir_.zend(c); }
  bool klaar() override { return ir_.klaar(); }
  void continu(bool aan) override { ir_.continu(aan); }

 private:
  IrHw &ir_;
  Mcp23017 &mcp_;
  volatile bool &mcpOk_;
};
