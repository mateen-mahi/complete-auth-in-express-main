import puppeteer from "puppeteer";

export async function generateCertificatePdf(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Match the viewport to the certificate's actual size BEFORE loading
    // content — without this, layout/positioning can be computed against
    // Puppeteer's default 800x600 viewport instead of your real page.
    await page.setViewport({ width: 1123, height: 794 });

    // "networkidle0" waits for network activity to fully stop — if the
    // template's Google Fonts @import can't be reached (blocked/no
    // internet on this server) that wait can stall and you get a blank
    // default page back. "load" only waits for the document itself plus
    // resources already in flight, so a blocked font request degrades to
    // the fallback font instead of blocking the whole render.
    await page.setContent(html, { waitUntil: "load", timeout: 15000 });

    const pdfBuffer = await page.pdf({
      width: "1123px",
      height: "794px",
      printBackground: true,
      // no `landscape` flag — explicit width/height already fixes
      // orientation, and combining both can conflict depending on
      // Puppeteer version.
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}