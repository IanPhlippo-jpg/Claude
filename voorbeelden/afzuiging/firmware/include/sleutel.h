// Versie 7.2 (advies Fable 5.2): de sleutel van de set gaat niet meer onversleuteld over de lucht. Knop en module maken
// elk bij het koppelen een sleutelpaar op Curve25519 (X25519, mbedtls in de ESP32-SDK), sturen alleen de publieke sleutel
// en rekenen hetzelfde gedeelde geheim uit. Daaruit komt met SHA-256 (samen met de uitdaging) de sleutel van de set
// (16 bytes, de LMK van ESP-NOW) en het bewijs in KOPPEL_BEVESTIG. Alleen voor de echte borden (niet in de pc-tests).
#pragma once
#ifdef ARDUINO
#include <esp_random.h>
#include <mbedtls/ecdh.h>
#include <mbedtls/sha256.h>
#include <string.h>

namespace afzuiging {

inline int sleutelRng(void *, unsigned char *buf, size_t len) {
  esp_fill_random(buf, len);
  return 0;
}

/** een nieuw sleutelpaar: geheim (32 bytes, little endian) en publiek (de X-coordinaat, 32 bytes) */
inline bool maakSleutelpaar(uint8_t geheim[32], uint8_t publiek[32]) {
  mbedtls_ecp_group g;
  mbedtls_mpi d;
  mbedtls_ecp_point Q;
  mbedtls_ecp_group_init(&g);
  mbedtls_mpi_init(&d);
  mbedtls_ecp_point_init(&Q);
  const bool ok = mbedtls_ecp_group_load(&g, MBEDTLS_ECP_DP_CURVE25519) == 0 && mbedtls_ecdh_gen_public(&g, &d, &Q, sleutelRng, nullptr) == 0 &&
                  mbedtls_mpi_write_binary_le(&d, geheim, 32) == 0 && mbedtls_mpi_write_binary_le(&Q.X, publiek, 32) == 0;
  mbedtls_ecp_point_free(&Q);
  mbedtls_mpi_free(&d);
  mbedtls_ecp_group_free(&g);
  return ok;
}

/** de sleutel van de set (16 bytes) uit het eigen geheim, de publieke sleutel van de ander en de uitdaging */
inline bool setSleutel(const uint8_t geheim[32], const uint8_t publiekAnder[32], uint32_t uitdaging, uint8_t sleutel[16]) {
  mbedtls_ecp_group g;
  mbedtls_mpi d, z;
  mbedtls_ecp_point Q;
  mbedtls_ecp_group_init(&g);
  mbedtls_mpi_init(&d);
  mbedtls_mpi_init(&z);
  mbedtls_ecp_point_init(&Q);
  uint8_t gedeeld[32] = {0};
  bool ok = mbedtls_ecp_group_load(&g, MBEDTLS_ECP_DP_CURVE25519) == 0 && mbedtls_mpi_read_binary_le(&d, geheim, 32) == 0 &&
            mbedtls_mpi_read_binary_le(&Q.X, publiekAnder, 32) == 0 && mbedtls_mpi_lset(&Q.Z, 1) == 0 &&
            mbedtls_ecdh_compute_shared(&g, &z, &Q, &d, sleutelRng, nullptr) == 0 && mbedtls_mpi_write_binary_le(&z, gedeeld, 32) == 0;
  uint8_t nul = 0;
  for (uint8_t b : gedeeld) nul |= b;
  ok = ok && nul != 0; // een publieke sleutel van lage orde geeft 0: weigeren
  if (ok) {
    uint8_t in[32 + 4 + 6], h[32];
    memcpy(in, gedeeld, 32);
    memcpy(in + 32, &uitdaging, 4);
    memcpy(in + 36, "LB-AFZ", 6);
    ok = mbedtls_sha256_ret(in, sizeof in, h, 0) == 0;
    memcpy(sleutel, h, 16);
  }
  memset(gedeeld, 0, sizeof gedeeld);
  mbedtls_ecp_point_free(&Q);
  mbedtls_mpi_free(&z);
  mbedtls_mpi_free(&d);
  mbedtls_ecp_group_free(&g);
  return ok;
}

/** het bewijs in KOPPEL_BEVESTIG: de eerste 8 bytes van SHA-256(sleutel, uitdaging, "bewijs") */
inline void koppelBewijs(const uint8_t sleutel[16], uint32_t uitdaging, uint8_t bewijs[8]) {
  uint8_t in[16 + 4 + 6], h[32];
  memcpy(in, sleutel, 16);
  memcpy(in + 16, &uitdaging, 4);
  memcpy(in + 20, "bewijs", 6);
  mbedtls_sha256_ret(in, sizeof in, h, 0);
  memcpy(bewijs, h, 8);
}

} // namespace afzuiging
#endif
