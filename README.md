# 🏎️ Formula One Points Chart

🔗 **[Live Demo](https://formulaonepointschart.vercel.app/)** &nbsp;|&nbsp; 📂 **[Repository](https://github.com/AMESocker/FormulaOnePointsChart)**

An interactive data visualization tool for exploring Formula 1 driver and constructor standings across multiple seasons. Built with D3.js and powered by live F1 race data.

---

## 📸 Preview

![Formula One Points Chart Screenshot](Screenshot_20240627_092153_Formula%20History%20Results.jpg)

---

## 📖 Overview

Formula One Points Chart transforms raw F1 race data into clear, interactive charts — making it easy to track how drivers and teams accumulate points across an entire season, or compare performance year over year.

The project is aimed at **F1 fans, data enthusiasts, and developers** who want a more engaging way to explore racing data than traditional stats tables.

---

## ✨ Features

- 📊 **Interactive points chart** — visualize driver and constructor standings race by race
- 🔄 **Multi-season support** — explore seasons from 2020 through 2026
- 👤 **Drivers & Teams views** — switch between Championship standings at a click
- 📸 **Share Chart** — capture and share a snapshot of the current chart
- ⚡ **Live data** — fetches up-to-date results via the Jolpica F1 API

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| [D3.js](https://d3js.org/) | Data visualization & interactive charts |
| [Jolpica F1 API](https://api.jolpi.ca/ergast/) | Formula 1 race data (Ergast-compatible mirror) |
| JavaScript / HTML / CSS | Core frontend |

> **Note:** This project originally used the Ergast API, which was deprecated at the end of 2024. It now uses the community-maintained [Jolpica mirror](https://github.com/jolpica/jolpica-f1), which is fully Ergast-compatible.

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/AMESocker/FormulaOnePointsChart.git
cd FormulaOnePointsChart

# Install dependencies
npm install

# Open index.html in your browser, or use a local server:
npx serve .
```

> **Note:** `node_modules` is included in the repository. Running `npm install` will ensure everything is up to date.

---

## 📁 Project Structure

```
FormulaOnePointsChart/
├── index.html          # Main app — driver & team points chart
├── quali.html          # Qualifying results view
├── script.js           # Core chart logic
├── api.js              # API fetching & data handling
├── helpers.js          # Utility functions
├── colors.js           # Driver/team color mappings
├── stats.js            # Stats calculations
└── style.css           # Main styles

```

---

## 📚 What I Learned

- Building complex, interactive charts with **D3.js**
- Fetching, caching, and transforming **REST API data** for visualization
- Designing responsive, data-driven interfaces for real-world datasets
- Handling API deprecation gracefully with a drop-in compatible replacement

---

## 🔮 Future Enhancements

-  Improved mobile layout and touch interactions
-  Qualifying performance comparisons
-  Historical championship comparisons across eras
-  Additional filters (e.g., by team, circuit, or points gap)
-  Time Delta by Race by lap

---

## 🤝 Contributing

This project is primarily for portfolio purposes, but suggestions and bug reports are welcome — feel free to open an issue.

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**.

---

## 📬 Contact

Built by **Aaron Socher** — Full-Stack Developer focused on frontend clarity and data-driven UX.

- 🐙 GitHub: [AMESocker](https://github.com/AMESocker)
- 💼 LinkedIn: [Aaron Socher](https://www.linkedin.com/in/aaron-socher/)
- 📧 Email: [aaronsocher@gmail.com](mailto:aaronsocher@gmail.com)