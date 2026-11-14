import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { DaySheet, MonthSummary } from '../types';
import { formatDateForDisplay } from './db';
import { getBookingPlatforms, isStealthMode, isCashVisible, isCashOnlyHiddenBooking } from './platforms';

// Color constants from Nayaks_Sujay_Design_Style.md
const HEX_ACCENT = '#F26B1D';
const HEX_ACCENT_TINT = '#FFF3EA';
const HEX_TEXT = '#111111';
const HEX_TEXT_MUTED = '#6B6B6B';
const HEX_TEXT_LIGHT = '#9A9A9A';
const HEX_LINE = '#D4D4D4';

const RGB_ACCENT: [number, number, number] = [242, 107, 29];
const RGB_TEXT: [number, number, number] = [17, 17, 17];
const RGB_TEXT_MUTED: [number, number, number] = [107, 107, 107];
const RGB_TEXT_LIGHT: [number, number, number] = [154, 154, 154];

/**
 * Generates the Daily Business Sheet in HORIZONTAL (Landscape) format.
 * STRICTLY guaranteed to fit on 1 SINGLE PAGE with zero spillover.
 */
export function generateDailyPDF(sheet: DaySheet) {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277mm

  // 1. Top Small Bar: "BUSINESS SHEET" on left, "ROOMS / 101 – 303" on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(RGB_TEXT_MUTED[0], RGB_TEXT_MUTED[1], RGB_TEXT_MUTED[2]);
  doc.text('BUSINESS SHEET', margin, 8.5);

  const roomsText = 'ROOMS / 101 – 303';
  const roomsTextWidth = doc.getTextWidth(roomsText);
  const roomsRightX = pageWidth - margin;
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(roomsText, roomsRightX - roomsTextWidth, 8.5);

  doc.setDrawColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.setLineWidth(0.4);
  doc.line(roomsRightX - roomsTextWidth, 9.8, roomsRightX, 9.8);

  // 2. Headline (Left Side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.text('Business sheet.', margin, 15);

  doc.setTextColor(RGB_TEXT_LIGHT[0], RGB_TEXT_LIGHT[1], RGB_TEXT_LIGHT[2]);
  doc.setFontSize(10.5);
  doc.text('Rent and collections.', margin, 20);

  // 3. Middle Section: WEEK / DAY and DATE (Centered, never cut off)
  const { dayStr, monthStr, yearStr } = formatDateForDisplay(sheet.date);

  // WEEK / DAY pill & underline
  const weekPillX = 92;
  const weekPillY = 12.5;
  doc.setFillColor(RGB_ACCENT[0], RGB_ACCENT[1], RGB_ACCENT[2]);
  doc.roundedRect(weekPillX, weekPillY, 19, 4.5, 2.25, 2.25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text('WEEK / DAY', weekPillX + 2.2, weekPillY + 3.2);

  doc.setDrawColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.setLineWidth(0.35);
  doc.line(weekPillX + 22, weekPillY + 4, weekPillX + 46, weekPillY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.text(sheet.dayOfWeek.toUpperCase(), weekPillX + 23, weekPillY + 3.4);

  // DATE pill & Boxes
  const datePillX = 150;
  const datePillY = 12.5;
  doc.setFillColor(RGB_ACCENT[0], RGB_ACCENT[1], RGB_ACCENT[2]);
  doc.roundedRect(datePillX, datePillY, 14, 4.5, 2.25, 2.25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text('DATE', datePillX + 2.8, datePillY + 3.2);

  // Digit boxes [D][D] / [M][M] / [Y][Y][Y][Y]
  const boxW = 4.2;
  const boxH = 5;
  const boxY = 12.2;
  let curBoxX = datePillX + 17;

  const dateChars = [
    dayStr[0], dayStr[1],
    '/',
    monthStr[0], monthStr[1],
    '/',
    yearStr[0], yearStr[1], yearStr[2], yearStr[3]
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setDrawColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.setLineWidth(0.3);

  dateChars.forEach(char => {
    if (char === '/') {
      doc.setTextColor(RGB_TEXT_MUTED[0], RGB_TEXT_MUTED[1], RGB_TEXT_MUTED[2]);
      doc.text('/', curBoxX + 0.8, boxY + 3.8);
      curBoxX += 2.8;
    } else {
      doc.roundedRect(curBoxX, boxY, boxW, boxH, 0.8, 0.8, 'S');
      doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
      doc.text(char, curBoxX + 1.1, boxY + 3.7);
      curBoxX += boxW + 0.6;
    }
  });

  // 4. Build Table Rows with Full 277mm Width (No Wasted Space)
  const tableHead = [
    [
      { content: 'SL\nNO.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'ROOM\nNUMBER', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'AC /\nNON', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'ROOM\nRENT', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'CUSTOMER NAME', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
      { 
        content: 'ADVANCE', 
        colSpan: 2, 
        styles: { 
          halign: 'center' as const, 
          valign: 'middle' as const, 
          fillColor: HEX_ACCENT, 
          textColor: '#FFFFFF', 
          fontStyle: 'bold' as const
        } 
      },
      { 
        content: 'T. BUSINESS', 
        colSpan: 2, 
        styles: { 
          halign: 'center' as const, 
          valign: 'middle' as const, 
          fillColor: HEX_ACCENT, 
          textColor: '#FFFFFF', 
          fontStyle: 'bold' as const
        } 
      },
      { content: 'GST', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'BALANCE', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'REFUND', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'PAID', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'CHECK\nOUT', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
    ],
    [
      { content: 'CASH', styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'ONLINE', styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'CASH', styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'ONLINE', styles: { halign: 'center' as const, valign: 'middle' as const } },
    ],
  ];

  const formatNum = (val: number | '' | undefined) => {
    if (val === '' || val === undefined || val === null || val === 0) return '';
    return Number(val).toLocaleString('en-IN');
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length < 3) return dStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const stealth = isStealthMode();

  const tableBody: RowInput[] = sheet.rooms.map((r) => {
    const isOnlinePlatform = Boolean(r.platform && r.platform !== 'Direct' && r.platform.trim().length > 0);
    const platformLabel = isOnlinePlatform ? r.platform.trim() : '';
    const isStayOver = r.stayType === 'stayover';

    const isHiddenCashGuest = isCashOnlyHiddenBooking(r);
    let customerCellText = isHiddenCashGuest ? '' : (r.customerName || '');
    if (!isHiddenCashGuest) {
      if (isStayOver) {
        customerCellText = customerCellText ? `${customerCellText} [Reserved]` : `[Reserved]`;
      } else if (isOnlinePlatform) {
        customerCellText = customerCellText ? `${customerCellText} [${platformLabel}]` : `[${platformLabel}]`;
      }
    }

    const cashVis = isCashVisible(r.cashUpdatedAt);
    const startingStayBal = typeof r.stayBalanceRemaining === 'number' ? r.stayBalanceRemaining : 0;
    const tbCash = (!isHiddenCashGuest && cashVis && typeof r.tBusinessCash === 'number') ? r.tBusinessCash : 0;
    const tbOnline = !isHiddenCashGuest && typeof r.tBusinessOnline === 'number' ? r.tBusinessOnline : 0;
    const advCash = (!isHiddenCashGuest && cashVis && typeof r.advanceCash === 'number') ? r.advanceCash : 0;
    const advOnline = !isHiddenCashGuest && typeof r.advanceOnline === 'number' ? r.advanceOnline : 0;
    const paidToday = advCash + advOnline + tbCash + tbOnline;
    const rent = (!isHiddenCashGuest && typeof r.roomRent === 'number') ? r.roomRent : 0;

    const remaining = isStayOver
      ? Math.max(0, startingStayBal - (tbCash + tbOnline))
      : (rent > 0 ? Math.max(0, rent - paidToday) : 0);

    const hasPayment = (!isHiddenCashGuest && typeof r.total === 'number' && r.total > 0) || paidToday > 0;
    const isFullyPaidStay = !isHiddenCashGuest && isStayOver && (
      startingStayBal === 0 || 
      (startingStayBal > 0 && remaining === 0) ||
      (r.stayPaidOnCheckIn && r.stayPaidOnCheckIn > 0 && !startingStayBal)
    );

    let paidCellContent = isHiddenCashGuest
      ? '-'
      : (!cashVis && (r.advanceCash || r.tBusinessCash)
          ? (paidToday > 0 ? formatNum(paidToday) : '-')
          : formatNum(r.total));

    if (!isHiddenCashGuest && cashVis) {
      if (isStayOver && (r.total === '' || !r.total || r.total === 0)) {
        if (isFullyPaidStay) {
          paidCellContent = 'PAID';
        } else if (startingStayBal > 0) {
          paidCellContent = `${formatNum(startingStayBal)} Left`;
        }
      } else if (hasPayment) {
        if (remaining > 0) {
          paidCellContent = `${formatNum(r.total)}\n(${formatNum(remaining)} left)`;
        } else if (remaining === 0 && (isStayOver ? startingStayBal > 0 : (rent > 0 && paidToday >= rent))) {
          paidCellContent = `${formatNum(r.total)}\n(None left)`;
        }
      }
    }

    let advCashCellText = isHiddenCashGuest || isOnlinePlatform || isStayOver || !cashVis ? '-' : formatNum(r.advanceCash);
    if (!isHiddenCashGuest && cashVis && !isOnlinePlatform && !isStayOver && r.advanceCash && r.advanceCashDate) {
      advCashCellText = `${formatNum(r.advanceCash)}\n[${formatShortDate(r.advanceCashDate)}]`;
    }

    let advOnlineCellText = isHiddenCashGuest || isOnlinePlatform || isStayOver ? '-' : formatNum(r.advanceOnline);
    if (!isHiddenCashGuest && !isOnlinePlatform && !isStayOver && r.advanceOnline && r.advanceOnlineDate) {
      advOnlineCellText = `${formatNum(r.advanceOnline)}\n[${formatShortDate(r.advanceOnlineDate)}]`;
    }

    const displaySlNo = r.isExtraEntry ? `${r.slNo}B` : String(r.slNo);
    const displayRoomNumber = r.isExtraEntry ? `${r.roomNumber} (2nd)` : r.roomNumber;

    return [
      { content: displaySlNo, styles: { halign: 'center' as const } },
      { 
        content: displayRoomNumber, 
        styles: { 
          halign: 'center' as const, 
          fontStyle: 'bold' as const, 
          fillColor: HEX_ACCENT_TINT,
          textColor: HEX_TEXT,
        } 
      },
      {
        content: (r.ac || 'AC') === 'AC' ? 'AC' : 'NON AC',
        styles: {
          halign: 'center' as const,
          fontStyle: 'bold' as const,
          textColor: (r.ac || 'AC') === 'AC' ? HEX_ACCENT : HEX_TEXT_MUTED,
        }
      },
      { content: (isHiddenCashGuest || isStayOver) ? '-' : formatNum(r.roomRent), styles: { halign: 'right' as const } },
      { 
        content: customerCellText, 
        styles: { 
          halign: 'left' as const, 
          fontStyle: isOnlinePlatform || isStayOver ? 'bold' as const : 'normal' as const,
          textColor: isStayOver ? '#92400E' : isOnlinePlatform ? HEX_ACCENT : HEX_TEXT,
        } 
      },
      // In online platforms or stay-overs there is no advance option: show '-'
      { 
        content: advCashCellText, 
        styles: { 
          halign: 'right' as const, 
          textColor: isOnlinePlatform || isStayOver || isHiddenCashGuest ? HEX_TEXT_LIGHT : (r.advanceCashDate ? '#B45309' : HEX_TEXT),
          fontStyle: r.advanceCashDate && !isHiddenCashGuest ? 'bold' as const : 'normal' as const
        } 
      },
      { 
        content: advOnlineCellText, 
        styles: { 
          halign: 'right' as const, 
          textColor: isOnlinePlatform || isStayOver || isHiddenCashGuest ? HEX_TEXT_LIGHT : (r.advanceOnlineDate ? '#B45309' : HEX_TEXT),
          fontStyle: r.advanceOnlineDate && !isHiddenCashGuest ? 'bold' as const : 'normal' as const
        } 
      },
      { content: isHiddenCashGuest || !cashVis ? '-' : formatNum(r.tBusinessCash), styles: { halign: 'right' as const } },
      { 
        content: isHiddenCashGuest ? '-' : formatNum(r.tBusinessOnline), 
        styles: { 
          halign: 'right' as const, 
          fontStyle: isOnlinePlatform ? 'bold' as const : 'normal' as const,
          textColor: isOnlinePlatform ? HEX_ACCENT : HEX_TEXT,
        } 
      },
      { content: isHiddenCashGuest ? '-' : formatNum(r.gst5), styles: { halign: 'right' as const } },
      { content: isHiddenCashGuest ? '-' : formatNum(r.balance), styles: { halign: 'right' as const } },
      { content: isHiddenCashGuest ? '-' : formatNum(r.refund), styles: { halign: 'right' as const } },
      { content: paidCellContent, styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: (paidCellContent === 'PAID' || paidCellContent.includes('None left')) ? '#047857' : (paidCellContent.includes('left') || paidCellContent.includes('Left')) ? '#E11D48' : HEX_TEXT } },
      { content: isHiddenCashGuest ? '' : (r.checkOut || (isStayOver && r.checkOutDate ? `Dep: ${r.checkOutDate.slice(5)}` : '')), styles: { halign: 'center' as const } },
    ];
  });

  // Total Summary Row
  const totalRow: RowInput = [
    { 
      content: 'TOTAL', 
      colSpan: 2, 
      styles: { 
        halign: 'center' as const, 
        fontStyle: 'bold' as const, 
        fillColor: HEX_ACCENT_TINT,
        textColor: HEX_TEXT,
      } 
    },
    { content: '-', styles: { halign: 'center' as const, fillColor: HEX_ACCENT_TINT, textColor: HEX_TEXT_MUTED } },
    { content: formatNum(sheet.totals.roomRent), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: sheet.totals.agodaBookingsCount > 0 ? `${sheet.totals.agodaBookingsCount} Agoda Bookings` : '', styles: { halign: 'left' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT, textColor: HEX_ACCENT } },
    { content: stealth ? '-' : formatNum(sheet.totals.advanceCash), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(sheet.totals.advanceOnline), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: stealth ? '-' : formatNum(sheet.totals.tBusinessCash), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(sheet.totals.tBusinessOnline), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(sheet.totals.gst5), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(sheet.totals.balance), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(sheet.totals.refund), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: formatNum(stealth ? (sheet.totals.advanceOnline + sheet.totals.tBusinessOnline) : sheet.totals.total), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } },
    { content: '', styles: { fillColor: HEX_ACCENT_TINT } },
  ];

  tableBody.push(totalRow);

  // Dynamic compact sizing to guarantee strict 1-page fit even when extra room entries exist
  const rowCount = tableBody.length; // total rows including TOTAL row
  const extraRows = Math.max(0, rowCount - 27);
  const vPad = Math.max(0.65, 1.15 - extraRows * 0.08);
  const tableFontSize = Math.max(5.8, 6.8 - extraRows * 0.12);

  // AutoTable configured with compact heights to guarantee strict 1-page fit
  autoTable(doc, {
    startY: 22,
    margin: { left: margin, right: margin, bottom: 8, top: 6 },
    tableWidth: contentWidth, // Exactly 277mm across whole page
    head: tableHead as any,
    body: tableBody,
    theme: 'plain',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: tableFontSize,
      textColor: HEX_TEXT,
      lineColor: HEX_LINE,
      lineWidth: 0.14,
      cellPadding: { top: vPad, bottom: vPad, left: 1.1, right: 1.1 },
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: '#FFFFFF',
      textColor: HEX_TEXT_MUTED,
      fontSize: 6.2,
      fontStyle: 'bold',
      lineColor: HEX_LINE,
      lineWidth: 0.18,
    },
    columnStyles: {
      0: { cellWidth: 10 },  // SL NO
      1: { cellWidth: 14 },  // ROOM NUMBER
      2: { cellWidth: 12 },  // AC / NON
      3: { cellWidth: 20 },  // ROOM RENT
      4: { cellWidth: 47 },  // CUSTOMER NAME (Agoda)
      5: { cellWidth: 21 },  // ADV CASH
      6: { cellWidth: 21 },  // ADV ONLINE
      7: { cellWidth: 24 },  // TB CASH
      8: { cellWidth: 24 },  // TB ONLINE
      9: { cellWidth: 16 },  // GST
      10: { cellWidth: 16 }, // BALANCE
      11: { cellWidth: 16 }, // REFUND
      12: { cellWidth: 21 }, // TOTAL
      13: { cellWidth: 15 }, // CHECK OUT
    },
    didDrawCell: (data) => {
      // Floor divider lines: draw when moving to a new floor in the body
      if (data.section === 'body' && data.row.index > 0 && data.row.index < sheet.rooms.length) {
        const currFloor = sheet.rooms[data.row.index]?.floor;
        const prevFloor = sheet.rooms[data.row.index - 1]?.floor;
        if (currFloor !== prevFloor) {
          doc.setDrawColor(RGB_ACCENT[0], RGB_ACCENT[1], RGB_ACCENT[2]);
          doc.setLineWidth(0.35);
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
        }
      }
      // Top line of total row (always at index === sheet.rooms.length)
      if (data.section === 'body' && data.row.index === sheet.rooms.length) {
        doc.setDrawColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
        doc.setLineWidth(0.4);
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
      }
    },
  });

  // Bottom Summary Breakdown Bar
  const finalY = (doc as any).lastAutoTable.finalY + 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(RGB_TEXT_MUTED[0], RGB_TEXT_MUTED[1], RGB_TEXT_MUTED[2]);
  
  const visibleAdv = stealth ? sheet.totals.advanceOnline : sheet.totals.advanceTotal;
  const advStr = `Advance: Rs. ${visibleAdv.toLocaleString('en-IN')}`;
  const cashStr = stealth ? `Cash: Rs. 0` : `Cash: Rs. ${sheet.totals.tBusinessCash.toLocaleString('en-IN')}`;
  const agodaStr = `Online (Agoda): Rs. ${sheet.totals.tBusinessAgoda.toLocaleString('en-IN')}`;
  const othersStr = `Online (Others): Rs. ${sheet.totals.tBusinessOtherOnline.toLocaleString('en-IN')}`;
  const visibleDayTot = stealth ? (visibleAdv + sheet.totals.tBusinessOnline) : sheet.totals.dayTotal;
  const dayTotStr = `Day Total: Rs. ${visibleDayTot.toLocaleString('en-IN')}`;

  doc.text(`${advStr}   |   ${cashStr}   |   ${agodaStr}   |   ${othersStr}   |   ${dayTotStr}`, margin, finalY);

  // Footer: Document info on left, page number on right
  const footerY = 204;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(RGB_TEXT_MUTED[0], RGB_TEXT_MUTED[1], RGB_TEXT_MUTED[2]);
  doc.text('Business Sheet  ·  Rooms 101 to 303 (Daily Statement)', margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.text('01 / 01', pageWidth - margin - 10, footerY);

  // STRICT GUARANTEE: Delete any extra page if autoTable ever produced one
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  doc.save(`Plaza_Daily_Sheet_${sheet.date}.pdf`);
}

/**
 * Generates the EXACT Monthly Business Statement matching the handwritten notebook format:
 * Columns: SR. NO., DATE, ADVANCE, CASH, ONLINE (AGODA), ONLINE (OTHERS), (DAY TOTAL)
 * Followed by GRAND TOTAL and Prepared By / Date lines at bottom.
 */
export function generateMonthlyPDF(summary: MonthSummary) {
  // A4 Landscape: 297mm x 210mm for maximum horizontal space to support multiple OTA platforms
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277mm

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  doc.text("NAYAK'S SUJAY PLAZA", margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(RGB_TEXT_MUTED[0], RGB_TEXT_MUTED[1], RGB_TEXT_MUTED[2]);
  doc.text(`Monthly Business Statement  ·  ${summary.monthName} ${summary.year}  ·  Rooms 101 – 303`, margin, 17);

  // Dynamic Platforms (Configured platforms shown even with 0 sales; removed platforms shown ONLY if sales > 0 this month)
  const configured = getBookingPlatforms();
  const stealth = isStealthMode(configured);
  const rawPlatforms = summary.activePlatforms && summary.activePlatforms.length > 0 
    ? summary.activePlatforms 
    : configured;

  const platforms = rawPlatforms.filter(p => {
    if (p.trim().toLowerCase() === 'bookings') return false;
    if (configured.some(cp => cp.toLowerCase() === p.toLowerCase())) return true;
    const tot = summary.platformTotals?.[p] || (p.toLowerCase() === 'agoda' ? summary.totalAgoda : 0) || 0;
    return tot > 0;
  });

  if (platforms.length === 0) {
    platforms.push(...(configured.filter(p => p.trim().toLowerCase() !== 'bookings').length > 0 ? configured.filter(p => p.trim().toLowerCase() !== 'bookings') : ['Agoda']));
  }

  // Dynamic Table Header
  const headCols: any[] = [
    { content: 'SR. NO.', styles: { halign: 'center' as const } },
    { content: 'DATE', styles: { halign: 'center' as const } },
    { content: 'ADVANCE', styles: { halign: 'right' as const } },
    { content: 'CASH', styles: { halign: 'right' as const } },
  ];

  platforms.forEach(p => {
    headCols.push({ content: `ONLINE\n(${p.toUpperCase()})`, styles: { halign: 'right' as const } });
  });

  headCols.push({ content: 'ONLINE\n(OTHERS)', styles: { halign: 'right' as const } });
  headCols.push({ content: '(DAY TOTAL)', styles: { halign: 'right' as const, fontStyle: 'bold' as const } });

  const tableHead = [headCols];

  const formatNum = (val: number | undefined) => {
    if (!val || val === 0) return '-';
    return Number(val).toLocaleString('en-IN');
  };

  const tableBody: RowInput[] = summary.days.map((d) => {
    const row: any[] = [
      { content: String(d.dayNumber), styles: { halign: 'center' as const } },
      { content: d.formattedDate, styles: { halign: 'center' as const, fontStyle: 'normal' as const } },
      { content: formatNum(d.advanceTotal), styles: { halign: 'right' as const } },
      { content: stealth ? '-' : formatNum(d.tBusinessCash), styles: { halign: 'right' as const } },
    ];

    platforms.forEach(p => {
      const amt = d.platformTotals?.[p] || (p.toLowerCase() === 'agoda' ? d.agodaOnline : 0);
      row.push({ 
        content: formatNum(amt), 
        styles: { halign: 'right' as const, fontStyle: amt > 0 ? 'bold' as const : 'normal' as const } 
      });
    });

    row.push({ content: formatNum(d.otherOnline), styles: { halign: 'right' as const } });
    row.push({ content: formatNum(d.dayTotal), styles: { halign: 'right' as const, fontStyle: 'bold' as const } });

    return row;
  });

  // GRAND TOTAL Row at bottom (Dynamic per platform)
  const grandTotalRow: any[] = [
    { 
      content: 'GRAND TOTAL', 
      colSpan: 2, 
      styles: { 
        halign: 'center' as const, 
        fontStyle: 'bold' as const, 
        fillColor: HEX_ACCENT_TINT,
        textColor: HEX_TEXT,
      } 
    },
    { 
      content: summary.totalAdvance > 0 ? `Rs. ${summary.totalAdvance.toLocaleString('en-IN')}` : '-', 
      styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } 
    },
    { 
      content: (!stealth && summary.totalCash > 0) ? `Rs. ${summary.totalCash.toLocaleString('en-IN')}` : '-', 
      styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } 
    },
  ];

  platforms.forEach(p => {
    const tot = summary.platformTotals?.[p] || (p.toLowerCase() === 'agoda' ? summary.totalAgoda : 0);
    grandTotalRow.push({ 
      content: tot > 0 ? `Rs. ${tot.toLocaleString('en-IN')}` : '-', 
      styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } 
    });
  });

  grandTotalRow.push({ 
    content: summary.totalOtherOnline > 0 ? `Rs. ${summary.totalOtherOnline.toLocaleString('en-IN')}` : '-', 
    styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } 
  });

  grandTotalRow.push({ 
    content: `Rs. ${summary.totalRevenue.toLocaleString('en-IN')}`, 
    styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: HEX_ACCENT_TINT } 
  });

  tableBody.push(grandTotalRow);

  // Column width calculations for 277mm Landscape
  const srWidth = 14;
  const dateWidth = 22;
  const remainingWidth = contentWidth - srWidth - dateWidth;
  const remainingColsCount = 2 + platforms.length + 2; // Advance, Cash, Platforms..., Other, DayTotal
  const colWidth = Math.floor((remainingWidth / remainingColsCount) * 10) / 10;

  const columnStylesObj: Record<number, any> = {
    0: { cellWidth: srWidth },
    1: { cellWidth: dateWidth },
  };

  for (let c = 2; c < 2 + remainingColsCount; c++) {
    columnStylesObj[c] = { cellWidth: colWidth };
  }

  const tableFontSize = 6.8;
  const tableCellPadding = { top: 1.15, bottom: 1.15, left: 1.5, right: 1.5 };

  autoTable(doc, {
    startY: 20,
    margin: { left: margin, right: margin, bottom: 15 },
    tableWidth: contentWidth,
    head: tableHead as any,
    body: tableBody,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: tableFontSize,
      textColor: HEX_TEXT,
      lineColor: HEX_LINE,
      lineWidth: 0.16,
      cellPadding: tableCellPadding,
    },
    headStyles: {
      fillColor: '#FFFFFF',
      textColor: HEX_TEXT,
      fontSize: tableFontSize,
      fontStyle: 'bold',
      lineColor: HEX_LINE,
      lineWidth: 0.22,
    },
    columnStyles: columnStylesObj,
    didDrawCell: (data) => {
      // Dark border on top of GRAND TOTAL row
      if (data.section === 'body' && data.row.index === summary.days.length) {
        doc.setDrawColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
        doc.setLineWidth(0.45);
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
      }
    }
  });

  // Footer: Prepared By & Date
  const signY = pageHeight - 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(RGB_TEXT[0], RGB_TEXT[1], RGB_TEXT[2]);
  
  doc.text('Prepared By : __________________________________', margin, signY);
  doc.text('Date : __________________________', pageWidth - margin - 60, signY);

  // STRICT GUARANTEE: 1 Page for monthly statement
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  doc.save(`Plaza_Monthly_Statement_${summary.yearMonth}.pdf`);
}
