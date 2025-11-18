
# US Energy and Emissions Monitor Dashboard – Combined SEDS + MER Variant

Data sources:

- `Complete_SEDS.csv` (SEDS, TETCB) for state-level consumption.
- `Table_1.1_Primary_Energy_Overview.xlsx` (MER Table 1.1) for national totals.

Layout:

- KPIs: combined view (state totals + national change).
- Trend: national primary energy (MER).
- Choropleth & ranking: state consumption (SEDS).
- Sankey-style card: national → states.

Run with Yarn:

```bash
yarn install
yarn dev
```
