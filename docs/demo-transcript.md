# Demo transcript

Real output captured on 2026-10-26 by running `npm run build && node scripts/demo.mjs`, which starts the server over stdio with the official MCP client SDK and calls the tools. Nothing is edited or mocked; live values (rates, earthquakes, weather) will differ when you run it.

```text
# 17 tools: get_exchange_rates, convert_currency, get_recent_earthquakes, get_public_holidays, check_date, add_business_days, count_business_days, list_provinces, get_province, find_district, validate_tckn, validate_vkn, validate_iban, get_prayer_times, get_weather, turkish_text, amount_to_words

> convert_currency {"amount":1000,"from":"USD","to":"TRY"}
{
  "amount": 1000,
  "from": "USD",
  "to": "TRY",
  "result": 49762.7,
  "rate": 49.7627,
  "rate_type": "forex_selling",
  "bulletin_date": "2026-10-26",
  "source_url": "https://www.tcmb.gov.tr/kurlar/today.xml"
}

> get_recent_earthquakes {"min_magnitude":2.5,"hours":24,"limit":3}
{
  "source": "AFAD",
  "source_url": "https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter",
  "count": 3,
  "earthquakes": [
    {
      "source": "AFAD",
      "time_utc": "2026-10-26T11:44:14.000Z",
      "time_tr": "2026-10-26 14:44:14",
      "magnitude": 2.5,
      "magnitude_type": "ML",
      "depth_km": 7,
      "latitude": 37.02717,
      "longitude": 28.92633,
      "location": "Köyceğiz (Muğla)",
      "province": "Muğla",
      "event_id": "597436"
    },
    {
      "source": "AFAD",
      "time_utc": "2026-10-26T11:35:19.000Z",
      "time_tr": "2026-10-26 14:35:19",
      "magnitude": 3.3,
      "magnitude_type": "ML",
      "depth_km": 16.85,
      "latitude": 37.01667,
      "longitude": 28.95417,
      "location": "Köyceğiz (Muğla)",
      "province": "Muğla",
      "event_id": "597435"
    },
    {
      "source": "AFAD",
      "time_utc": "2026-10-26T01:18:08.000Z",
      "time_tr": "2026-10-26 04:18:08",
      "magnitude": 2.7,
      "magnitude_type": "ML",
      "depth_km": 6.89,
      "latitude": 39.18183,
      "longitude": 36.34767,
      "location": "Gemerek (Sivas)",
      "province": "Sivas",
      "event_id": "597411"
    }
  ]
}

> check_date {"date":"2026-10-29"}
{
  "date": "2026-10-29",
  "weekday": "Thursday",
  "is_weekend": false,
  "holidays": [
    {
      "date": "2026-10-29",
      "weekday": "Thursday",
      "name_tr": "Cumhuriyet Bayramı",
      "name_en": "Republic Day",
      "duration": "full",
      "type": "national"
    }
  ],
  "is_business_day": false
}

> add_business_days {"start":"2026-10-27","days":3}
{
  "start": "2026-10-27",
  "days": 3,
  "result": "2026-11-02",
  "result_weekday": "Monday"
}

> validate_iban {"iban":"TR36 0001 0001 2345 6789 0123 45"}
{
  "input": "TR36 0001 0001 2345 6789 0123 45",
  "valid": true,
  "formatted": "TR36 0001 0001 2345 6789 0123 45",
  "bank_code": "00010",
  "bank": "T.C. Ziraat Bankası A.Ş.",
  "reserved_digit": "0",
  "account_part": "0123456789012345"
}

> amount_to_words {"amount":1250.5}
{
  "amount": "1250.50",
  "currency": "TRY",
  "text": "Bin İki Yüz Elli Türk Lirası Elli Kuruş",
  "compact": "BinİkiYüzElliTL,ElliKr",
  "upper": "BİN İKİ YÜZ ELLİ TÜRK LİRASI ELLİ KURUŞ"
}

> turkish_text {"text":"istanbul ılık","operation":"upper"}
{
  "operation": "upper",
  "input": "istanbul ılık",
  "output": "İSTANBUL ILIK"
}

> get_prayer_times {"province":"Ankara"}
{
  "date": "2026-10-26",
  "place": "Ankara",
  "latitude": 39.91987,
  "longitude": 32.85427,
  "timezone": "Europe/Istanbul",
  "times": {
    "imsak": "05:30",
    "gunes": "07:04",
    "ogle": "12:38",
    "ikindi": "15:34",
    "aksam": "18:01",
    "yatsi": "19:20"
  },
  "method": "Diyanet İşleri Başkanlığı, Turkey (experimental)",
  "source": "Aladhan API (https://aladhan.com), method 13 (Diyanet)",
  "note": "Computed times; may differ from Diyanet's official published times by 1-2 minutes."
}

> get_weather {"province":"İzmir","days":1}
{
  "place": "İzmir",
  "latitude": 38.41273,
  "longitude": 27.13838,
  "current": {
    "time_tr": "2026-10-26T15:45",
    "temperature_c": 17.9,
    "feels_like_c": 17.4,
    "humidity_pct": 83,
    "wind_kmh": 15.3,
    "condition": "Light rain"
  },
  "daily": [
    {
      "date": "2026-10-26",
      "condition": "Light rain",
      "min_c": 14.5,
      "max_c": 20.8,
      "precipitation_mm": 10.3,
      "precipitation_probability_pct": 100
    }
  ],
  "source": "Open-Meteo (https://open-meteo.com), CC BY 4.0. Free for non-commercial use."
}

```
