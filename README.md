# SecureRegent Business Performance & Revenue Analytics Dashboard

An interactive business analytics dashboard built with **React, JavaScript, Vite, and CSS**. It demonstrates how business data can be explored through KPI cards, charts, date-based comparisons, searchable records, and connected business workflows.

**[Live Demo](https://secureregent-business-dashboard.vercel.app) · [GitHub Repository](https://github.com/Meenugs1/secureregent-business-dashboard)**

## Overview

Business teams often need a clear view of the journey from lead generation to quotations, deals, orders, invoices, and payments. SecureRegent demonstrates a centralized dashboard for exploring these connected records and understanding business performance over a selected time period.

The project uses a local dummy dataset and is intended as a frontend demonstration, not a live business reporting system.

## Features

### Business KPIs
- Summary cards for new, qualified, converted, and unqualified leads.
- Lead conversion rate, quotations created, deals created, and invoices generated.
- Previous-period comparisons with percentage changes.

### Lead Analytics
- Lead generation trends and qualified-lead comparisons.
- Lead source distribution.
- Interactive chart and source selections to explore relevant records.

### Quotation Analytics
- Quotation counts and values.
- Quotation status funnel covering created, sent, viewed, and accepted stages.
- Drill-down access to quotation records and related leads or deals.

### Deals, Revenue, Orders & Payments
- Deal status and won-deal revenue analysis.
- Order fulfilment stages, collected amounts, and outstanding balances.
- Payment and invoice record exploration.
- Navigation between related leads, quotations, deals, orders, payments, and invoices.

### Date Filters & Comparisons
- Today
- Last 7 Days
- Last 30 Days
- Custom date range

The dashboard compares the selected period with the preceding period of the same duration.

### Search, Drill-Downs & CSV Export
- Searchable record lists.
- Interactive record details and related-record navigation.
- CSV export for dashboard summaries and filtered record lists.

### Interface & Accessibility
- Responsive dashboard layout.
- Keyboard-operable record navigation and chart interactions where implemented.
- Accessible labels and dialog semantics for the record drill-down interface.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface and state management |
| JavaScript | Dashboard calculations, filtering, comparisons, and interactions |
| Vite | Development server and production build tooling |
| CSS | Layout, styling, and responsive presentation |
| Oxlint | JavaScript and JSX linting |
| Local JavaScript dataset | Demonstration business records and relationships |

## Screenshots

The repository currently contains `dashboard-reference.png`. If this image represents the current running application, it can be displayed here:

![SecureRegent dashboard preview](./dashboard-reference.png)

If it is only a design reference, replace it with a fresh screenshot of the live application before using it as a project screenshot.

## Getting Started

### Prerequisites

- Node.js compatible with the Vite version in `package.json`
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Meenugs1/secureregent-business-dashboard.git
cd secureregent-business-dashboard
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed in the terminal.

### Build for Production

```bash
npm run build
```

Vite generates the production build in the `dist/` directory.

### Preview the Production Build

```bash
npm run preview
```

### Run the Linter

```bash
npm run lint
```

## Project Structure

```text
secureregent-business-dashboard/
├── public/                  # Public static assets
├── src/
│   ├── data/
│   │   └── businessData.js  # Centralized dummy business dataset
│   ├── utils/
│   │   └── csv.js           # CSV download utility
│   ├── App.jsx              # Dashboard UI, metrics and interactions
│   ├── App.css              # Dashboard component styling
│   ├── index.css            # Global styles
│   └── main.jsx             # Application entry point
├── .gitignore
├── dashboard-reference.png
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Data & Limitations

- The dashboard uses a centralized local dummy dataset.
- KPI values and charts are calculated from the demonstration records.
- It does not currently connect to a backend API or production database.
- The displayed business figures are illustrative and should not be interpreted as real company performance.
- CSV exports are generated from the locally available dashboard data.

## Future Improvements

Potential next steps include:
- Integrating a backend API and persistent database.
- Adding authentication and role-based access if required.
- Connecting the dashboard to verified business data sources.
- Expanding automated tests and validation for analytics calculations.
- Improving chart accessibility and adding further reporting options.

These are possible future enhancements, not claims about existing functionality.

## Project Context

Developed as a frontend development internship assignment for SecureRegent Private Limited.

## Links

- **Live Demo:** https://secureregent-business-dashboard.vercel.app
- **Source Code:** https://github.com/Meenugs1/secureregent-business-dashboard
