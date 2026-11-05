# Nayak's Sujay Plaza · Reception Management System

A web application designed for the hotel front desk receptionist at **Nayak's Sujay Plaza** to record, calculate, and audit daily room rents, advances, sales collections, taxes, and checkouts for all 26 rooms (101 to 303), with Supabase cloud database synchronization and 1-page PDF reports.

Built following the official design specifications (Apple-style typography, hotel orange accent `#F26B1D`, soft peach `#FFF3EA`, and thin line grid).

---

## 🌟 Key Features

1. **Daily Business Sheet (Horizontal Landscape Ledger)**:
   - Covers all 26 rooms across 3 floors (`101`–`110`, `201`–`213`, `301`–`303`).
   - **Customer Name & Agoda Tagging**: If a guest name is entered, the room is automatically recognized as an Agoda booking.
   - **Agoda Accounting Rules**: For Agoda bookings, advance inputs are disabled (`—`), and the booking amount is entered under `T. Business -> Online`.
   - **Real-Time Formula**: `Day Total = Advance + Cash + Online (Agoda) + Online (Others)`.
   - **Manual GST Input**: Front desk can manually input GST amounts.

2. **Strictly 1-Page PDF Generation**:
   - **Daily Sheet PDF**: Full-width A4 Landscape sheet matching the front desk document with centered date, zero empty right-hand space, and programmatic 1-page guarantee.
   - **Monthly Statement PDF**: Formatted exactly like the handwritten physical register (`SR. NO.`, `DATE`, `ADVANCE`, `CASH`, `ONLINE (AGODA)`, `ONLINE (OTHERS)`, `(DAY TOTAL)`, `GRAND TOTAL`, and `Prepared By / Date` signatures).

3. **Cloud Database (Supabase) + Offline Local Cache**:
   - Live cloud synchronization with Supabase PostgreSQL database.
   - Built-in Dexie.js (IndexedDB) offline fallback so the desk can keep working even if internet drops.
   - 1-Click JSON Backup and Restore in Settings.

4. **Month Analytics**:
   - Interactive daily revenue bar chart with hover tooltips.
   - Peak sales day and peak occupancy metrics.
   - Day-of-week breakdown (weekdays vs weekends) and channel mix (Agoda vs Cash vs Direct Online).
   - Top 5 grossing days table.

5. **Typewriter Splash Screen & Responsive Mobile Dock**:
   - Apple-style splash screen typing out *"Nayak's Sujay"* in hotel orange.
   - Mobile bottom navigation dock and swipeable table with sticky room column.
   - Mobile card view toggle for single-hand touch input on smartphones.

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```

---

## ☁️ Deployment on Netlify

1. Push this repository to GitHub.
2. Log into [Netlify](https://app.netlify.com).
3. Click **Add new site** > **Import an existing project** > **GitHub**.
4. Choose the repository: `darshannayak21/nayakssujaybusiness`.
5. Netlify will automatically detect:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add the following **Environment Variables** in Netlify (**Site configuration** > **Environment variables**):
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Publishable / Anon Key
7. Click **Deploy Site**!
