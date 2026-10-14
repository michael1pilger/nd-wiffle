# Historical record audit v141

Historical team W-L on the Teams page is reconstructed from player-season pitching decisions, so missing forfeits or missing pitcher decisions create incomplete team records.

Regular-season game targets used for the gap audit:
- 2021: 30
- 2022: 21
- 2023: 24
- 2024: 24
- 2025: 24

The CSV `HISTORICAL_RECORD_GAPS_v141.csv` lists every active franchise-season and the difference between reconstructed W+L and the regular-season target.

## 2021 Underdawgs anomaly
The only 2021 batting row assigned to Underdawgs is:
[
  {
    "Player_ID": "ryan_mccain",
    "Name": "Ryan McCain",
    "PAs": "15",
    "ABs": "15",
    "Hits": "8",
    "HRs": "1",
    "RBI": ""
  }
]

Because the league had only the original four franchises in 2021, v141 suppresses the impossible 2021 Underdawgs team row from the historical Teams-page season view. The underlying player-season row is not reassigned because the correct 2021 franchise has not yet been established.
