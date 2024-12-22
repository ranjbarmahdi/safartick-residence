const cheerio = require('cheerio');
const { getBrowser, getRandomElement, shuffleArray, delay, isNumeric } = require('./utils');
const db = require('./config.js');
const { timeout } = require('puppeteer');

// ============================================ insertUrl
async function insertUrl(url) {
    const existsQuery = `
        SELECT * FROM unvisited u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO unvisited ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insert url function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ findAllMainLinks
async function findAllMainLinks(page, initialUrl) {
    const allMainLinks = [];
    try {
        const url = initialUrl;
        await page.goto(url, { timeout: 360000 });

        // sleep 5 second
        console.log('-------sleep 5 second');
        await delay(5000);

        // load cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        // Getting All Main Urls In This Page
        const mainLinks = ['https://jajooreh.com/?respage=3'];

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(...mainLinks);
    } catch (error) {
        console.log('Error In findAllMainLinks function', error.message);
    }

    return Array.from(new Set(allMainLinks));
}

// ============================================ findAllPagesLinks
async function findAllPagesLinks(page, mainLinks) {
    let allPagesLinks = [];

    // find pagination and pages
    for (let i = 0; i < mainLinks.length; i++) {
        try {
            const url = mainLinks[i];
            console.log('============================================================');
            console.log('start findind pages for main link :', url);
            await page.goto(url, { timeout: 360000 });

            await delay(5000);

            try {
                await page.waitForSelector('.pagination-ul > li > .pagination-link', {
                    timeout: 5000,
                });
                console.log('pagination element find');
            } catch (error) {
                console.log('pagination element not find');
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls
            const paginationElement = $('.pagination-ul > li > .pagination-link');
            if (paginationElement.length) {
                lsatPageNumber = Math.max(
                    ...$('.pagination-ul > li > .pagination-link')
                        .filter((i, e) => isNumeric($(e).text().trim()))
                        .map((i, e) => Number($(e).text().trim()))
                        .get()
                );

                console.log('lsatPageNumber :', lsatPageNumber);
                for (let j = 1; j <= lsatPageNumber; j++) {
                    const newUrl = url + `?page=${j}`;
                    allPagesLinks.push(newUrl);
                }
            } else {
                allPagesLinks.push(url);
            }
        } catch (error) {
            console.log('Error in findAllPagesLinks', error);
        }
    }

    allPagesLinks = shuffleArray(allPagesLinks);
    return Array.from(new Set(allPagesLinks));
}

// ============================================ findAllProductsLinks
async function findAllProductsLinks(page, allPagesLinks) {
    for (let i = 0; i < allPagesLinks.length; i++) {
        try {
            const url = allPagesLinks[i];
            console.log(
                '============================================================ loop:',
                i + 1
            );
            console.log('Start Finding products urls from page :', url);
            await page.goto(url, { timeout: 360000 });

            // sleep 5 second when switching between pages
            console.log('-------sleep 5 second');
            await delay(5000);

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);

                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = [
                    'https://jajooreh.com/residence/villa-for-rent-with-pool-and-sauna-in-kurdan/',
                    'https://jajooreh.com/residence/villa-with-pool-for-rent-in-isfahan-falavarjan/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-an-indoor-pool-6/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-3-bedrooms-with-jacuzzi/',
                    'https://jajooreh.com/residence/3-bedroom-luxury-villa-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/modern-3-bedroom-villa-for-rent-with-game-equipment/',
                    'https://jajooreh.com/residence/newly-built-villa-with-hot-water-pool-for-rent-3-bedrooms/',
                    'https://jajooreh.com/residence/3-bedroom-luxury-modern-indoor-villa-for-rent/',
                    'https://jajooreh.com/residence/rent-a-villa-near-the-beach-with-a-spa-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-with-3-master-bedrooms-and-a-roof-garden/',
                    'https://jajooreh.com/residence/villa-with-jacuzzi-pool-in-marwarid-darya-town/',
                    'https://jajooreh.com/residence/villa-for-rent-with-indoor-pool-and-billiards/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-with-pool-in-mahmoud-abad/',
                    'https://jajooreh.com/residence/rent-an-apartment-in-dubai/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-spa-pool-and-billiards/',
                    'https://jajooreh.com/residence/3-bedroom-super-luxury-villa-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/super-luxury-mansion-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/villa-for-rent-with-hot-water-pool-in-kurdan-2/',
                    'https://jajooreh.com/residence/luxury-5-bedroom-mansion-for-rent-with-jacuzzi-in-kordan/',
                    'https://jajooreh.com/residence/rent-a-villa-with-a-spa-pool-in-kordan/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-3-bedrooms-spa-pool/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-with-heated-pool/',
                    'https://jajooreh.com/residence/renting-a-villa-in-soheiliyeh-with-a-spa-pool/',
                    'https://jajooreh.com/residence/3-bedroom-villa-with-pool-for-rent-in-ramsar/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-duplex-with-sisli-terrace/',
                    'https://jajooreh.com/residence/furnished-apartment-for-rent-in-taksim-istanbul-2/',
                    'https://jajooreh.com/residence/villa-for-rent-in-modern-kurdan-with-spa-pool-and-billiards/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-spa-pool-in-soheiliyeh/',
                    'https://jajooreh.com/residence/4-bedroom-full-game-villa-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/kurdan-spa-villa-for-rent/',
                    'https://jajooreh.com/residence/modern-villa-for-rent-with-swimming-pool-in-kordan/',
                    'https://jajooreh.com/residence/cheap-double-suite-for-rent-in-taksim/',
                    'https://jajooreh.com/residence/three-bedroom-unit-for-rent-osman-b-sishli/',
                    'https://jajooreh.com/residence/furnished-suite-for-rent-in-taksim-near-esteghlal/',
                    'https://jajooreh.com/residence/mehrabad-pool-villa-for-rent/',
                    'https://jajooreh.com/residence/renting-a-4-bedroom-triplex-villa-with-a-swimming-pool-and-a-jacuzzi/',
                    'https://jajooreh.com/residence/villa-for-rent-with-hot-water-pool-in-kurdan-3/',
                    'https://jajooreh.com/residence/villa-for-rent-in-rodhen-with-an-indoor-pool-2/',
                    'https://jajooreh.com/residence/modern-villa-for-rent-with-jacuzzi-in-sarkhrood/',
                    'https://jajooreh.com/residence/6-bedroom-villa-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/daily-rent-of-a-furnished-apartment-in-tabriz/',
                    'https://jajooreh.com/residence/villa-for-rent-with-pool-and-jacuzzi-in-soheiliyeh/',
                    'https://jajooreh.com/residence/the-travelers-house-is-the-peace-of-pave-monastery/',
                    'https://jajooreh.com/residence/rent-a-villa-in-kurdan-with-a-spa-pool/',
                    'https://jajooreh.com/residence/daily-rent-of-an-apartment-in-shariati/',
                    'https://jajooreh.com/residence/daily-rent-of-an-apartment-in-shariati-tehran-2/',
                    'https://jajooreh.com/residence/villa-for-rent-with-hot-water-pool/',
                    'https://jajooreh.com/residence/triplex-villa-for-rent-with-jacuzzi-pool/',
                    'https://jajooreh.com/residence/2-bedroom-villa-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-jacuzzi-pool-in-rodhen/',
                    'https://jajooreh.com/residence/house-for-rent-with-sea-view-and-bridge-in-besiktas/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordzar-villa-village/',
                    'https://jajooreh.com/residence/daily-rent-of-an-apartment-in-shariati-tehran/',
                    'https://jajooreh.com/residence/daily-rent-of-sohrodi-apartment/',
                    'https://jajooreh.com/residence/renting-a-beach-villa-with-a-pool-in-sarkhrood/',
                    'https://jajooreh.com/residence/single-suite-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-between-rasht-anzali/',
                    'https://jajooreh.com/residence/rent-a-suite-in-stara/',
                    'https://jajooreh.com/residence/full-game-villa-for-rent-in-serkhrood/',
                    'https://jajooreh.com/residence/arghavan-apartment-for-rent-in-karaj/',
                    'https://jajooreh.com/residence/luxury-one-bedroom-apartment-for-rent-in-taksim/',
                    'https://jajooreh.com/residence/suhravardi-duplex-apartment-for-rent/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-in-kurdan-with-spa-pool/',
                    'https://jajooreh.com/residence/3-bedroom-duplex-villa-for-rent-with-indoor-pool/',
                    'https://jajooreh.com/residence/luxury-apartment-on-baghdad-street-near-the-sea/',
                    'https://jajooreh.com/residence/istanbul-luxury-apartment-in-nisantasi/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-full-game-jacuzzi-pool-in-kordan/',
                    'https://jajooreh.com/residence/newly-built-villa-for-rent-near-lahijan/',
                    'https://jajooreh.com/residence/four-bedroom-swiss-villa-for-rent-in-chamestan/',
                    'https://jajooreh.com/residence/villa-for-rent-in-masal-shanderman/',
                    'https://jajooreh.com/residence/4-season-pool-villa-for-rent-in-tehrandasht/',
                    'https://jajooreh.com/residence/villa-kordan-with-a-swimming-pool-on-the-roof-of-the-spa/',
                    'https://jajooreh.com/residence/villa-for-rent-in-masal/',
                    'https://jajooreh.com/residence/luxury-villa-for-rent-in-kordan-with-tennis-court/',
                    'https://jajooreh.com/residence/rent-a-luxury-villa-in-kurdan/',
                    'https://jajooreh.com/residence/5-bedroom-ultra-luxury-mansion-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-in-khaneh-darya-town/',
                    'https://jajooreh.com/residence/4-bedroom-triplex-villa-for-rent-in-sarkhrood/',
                    'https://jajooreh.com/residence/4-bedroom-triplex-villa-for-rent-in-mahmoud-abad/',
                    'https://jajooreh.com/residence/villa-for-rent-in-soheilieh-kordan-with-a-pool/',
                    'https://jajooreh.com/residence/villa-with-pool-for-rent-in-soheiliyeh/',
                    'https://jajooreh.com/residence/4-bedroom-villa-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/furnished-apartment-for-rent-in-taksim-istanbul-4/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-two-pools-4-bedrooms/',
                    'https://jajooreh.com/residence/newly-built-2-bedroom-modern-villa-for-rent/',
                    'https://jajooreh.com/residence/furnished-apartment-for-rent-in-istanbul-taksim/',
                    'https://jajooreh.com/residence/swiss-cottage-for-rent-around-tehran/',
                    'https://jajooreh.com/residence/villa-for-rent-with-indoor-jacuzzi-in-kordan/',
                    'https://jajooreh.com/residence/furnished-apartment-for-rent-in-taksim-istanbul-3/',
                    'https://jajooreh.com/residence/luxury-two-bedroom-for-rent-in-taksim-2/',
                    'https://jajooreh.com/residence/luxury-two-bedroom-for-rent-in-taksim/',
                    'https://jajooreh.com/residence/apartment-suite-for-rent-in-istanbul-taksim/',
                    'https://jajooreh.com/residence/mehrabad-rodhan-villa-for-rent-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/renting-a-villa-in-the-center-of-shiraz/',
                    'https://jajooreh.com/residence/villa-with-pool-for-rent-in-shiraz/',
                    'https://jajooreh.com/residence/aydin-kents-apartment-in-blue-city-turkiye/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-in-khazarabad-sari/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-four-season-pool-in-tehrandasht/',
                    'https://jajooreh.com/residence/daily-rent-of-a-villa-with-a-hot-water-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-with-an-indoor-pool-in-shahryar/',
                    'https://jajooreh.com/residence/luxury-1-bedroom-apartment-hotel-in-istanbul/',
                    'https://jajooreh.com/residence/3-bedroom-duplex-with-heated-outdoor-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kalardasht-with-forest-view/',
                    'https://jajooreh.com/residence/5-bedroom-villa-for-rent-with-indoor-pool-in-kordan/',
                    'https://jajooreh.com/residence/renting-a-villa-with-two-hot-water-pools-in-kurdan/',
                    'https://jajooreh.com/residence/4-bedroom-triplex-villa-for-rent-in-rodhen/',
                    'https://jajooreh.com/residence/rent-a-4-bedroom-villa-with-a-pool-and-jacuzzi-in-rodhan/',
                    'https://jajooreh.com/residence/rent-a-4-bedroom-villa-with-a-pool-in-rodhen/',
                    'https://jajooreh.com/residence/modern-3-bedroom-villa-for-rent-with-jacuzzi/',
                    'https://jajooreh.com/residence/villa-for-rent-with-hot-water-pool-in-kurdan/',
                    'https://jajooreh.com/residence/renting-a-villa-with-pool-and-jacuzzi-in-rodhen/',
                    'https://jajooreh.com/residence/villa-garden-for-rent-indoor-swimming-pool-rodhen/',
                    'https://jajooreh.com/residence/luxury-two-bedroom-villa-with-indoor-pool/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli-on-cumhuriyet-blvd/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli-3/',
                    'https://jajooreh.com/residence/summer-outdoor-pool-villa-rental-in-rodhen/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-luxury-town-of-tavousieh/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-2-bedrooms-modern-indoor-pool/',
                    'https://jajooreh.com/residence/duplex-villa-with-spa-pool-in-kordan/',
                    'https://jajooreh.com/residence/four-bedroom-villa-for-rent-in-rodhen/',
                    'https://jajooreh.com/residence/villa-for-rent-in-rodhen-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/rent-a-villa-in-kurdan-with-a-summer-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-with-an-indoor-pool-in-rodhen/',
                    'https://jajooreh.com/residence/renting-a-two-bedroom-apartment-hotel-in-istanbul/',
                    'https://jajooreh.com/residence/renting-an-apartment-hotel-in-istanbul/',
                    'https://jajooreh.com/residence/full-2-bedroom-apartment-for-rent-in-sisli/',
                    'https://jajooreh.com/residence/furnished-apartment-for-rent-in-taksim-istanbul/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-shahin-north-tehran/',
                    'https://jajooreh.com/residence/three-bedroom-villa-for-rent-with-hot-water-pool/',
                    'https://jajooreh.com/residence/daily-rent-of-an-apartment-in-tehran-ponk/',
                    'https://jajooreh.com/residence/rent-a-villa-in-kurdan-with-a-pool-for-special-parties/',
                    'https://jajooreh.com/residence/rent-a-villa-with-a-heated-pool-billiards-air-hockey-in-kurdan/',
                    'https://jajooreh.com/residence/rent-a-villa-with-jacuzzi-in-kurdan/',
                    'https://jajooreh.com/residence/rent-a-modern-kurdan-villa-with-billiards/',
                    'https://jajooreh.com/residence/garnet-mansion-5-bedrooms-super-luxury-b/',
                    'https://jajooreh.com/residence/modern-mansion-for-rent-in-kurdan-with-swimming-pool-and-billiards/',
                    'https://jajooreh.com/residence/200m-vip-apartment-for-rent-in-shiraz-sattarkhan/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-courtyard-in-shiraz-dasht-palace/',
                    'https://jajooreh.com/residence/rent-a-luxury-apartment-in-farhangshahr-shiraz/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-the-best-location-of-shiraz/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-in-kurdan-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/3-bedroom-villa-with-pool-for-rent-in-rodhan/',
                    'https://jajooreh.com/residence/swiss-cottage-for-rent-in-namak-abroud/',
                    'https://jajooreh.com/residence/rent-a-villa-in-kurdan-with-a-billiard-table/',
                    'https://jajooreh.com/residence/renting-a-special-and-modern-villa-with-full-facilities/',
                    'https://jajooreh.com/residence/5-bedroom-villa-for-rent-with-a-movable-glass-pool/',
                    'https://jajooreh.com/residence/rent-a-villa-in-meygun/',
                    'https://jajooreh.com/residence/renting-a-4-bedroom-villa-with-a-pool-in-go-motel/',
                    'https://jajooreh.com/residence/villa-with-pool-for-rent-in-babolsar/',
                    'https://jajooreh.com/residence/apartment-with-jacuzzi-for-rent-in-shiraz/',
                    'https://jajooreh.com/residence/7-bedroom-beach-villa-for-rent-in-chalos/',
                    'https://jajooreh.com/residence/4-bedroom-duplex-villa-for-rent-with-pool-in-tonkabon/',
                    'https://jajooreh.com/residence/2-bedroom-villa-for-rent-in-kalardasht/',
                    'https://jajooreh.com/residence/two-bedroom-villa-for-rent-in-saravan/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-paveh-with-private-parking/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-with-all-facilities/',
                    'https://jajooreh.com/residence/two-bedroom-forest-villa-in-jovarem/',
                    'https://jajooreh.com/residence/rent-a-modern-villa-with-a-spa-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-an-indoor-pool-3/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-an-indoor-pool-7/',
                    'https://jajooreh.com/residence/house-for-rent-in-paveh-palangan/',
                    'https://jajooreh.com/residence/renting-a-modern-2-bedroom-duplex-indoor-villa/',
                    'https://jajooreh.com/residence/five-bedroom-duplex-villa-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/full-game-mansion-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/villa-for-rent-indoor-pool-spa-with-billiards/',
                    'https://jajooreh.com/residence/villa-for-rent-with-indoor-pool-in-soheiliyeh/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-billiards-and-jacuzzi/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-with-indoor-pool/',
                    'https://jajooreh.com/residence/special-design-english-villa-in-kordan-tavousiyeh/',
                    'https://jajooreh.com/residence/villa-with-a-pool-for-rent-with-a-dreamy-view-in-ramsar/',
                    'https://jajooreh.com/residence/3-chambres-piscine-interieure/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-4-bedrooms-with-indoor-pool/',
                    'https://jajooreh.com/residence/%d8%b9%d9%85%d8%a7%d8%b1%d8%aa-%d9%81%d9%88%d9%84-%da%af%db%8c%d9%85-%d9%86%d8%b2%d8%af%db%8c%da%a9-%d8%aa%d9%87%d8%b1%d8%a7%d9%86/',
                    'https://jajooreh.com/residence/neat-apartment-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli-ground-floor-with-independent-yard/',
                    'https://jajooreh.com/residence/one-bedroom-apartment-for-rent-in-istanbul-sisli/',
                    'https://jajooreh.com/residence/renting-a-villa-with-a-spa-pool-in-ramsar/',
                    'https://jajooreh.com/residence/villa-for-rent-in-ramsar-3-bedrooms-forest-with-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-nowshahr-4-bedroom-triplex-with-pool/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-in-kalardasht/',
                    'https://jajooreh.com/residence/villa-for-rent-in-chalos-4-bedrooms-with-pool/',
                    'https://jajooreh.com/residence/super-luxury-apartment-with-a-view-of-the-sea-and-the-vessur-strait/',
                    'https://jajooreh.com/residence/daily-luxury-apartment-rental-in-taksim/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-ankara/',
                    'https://jajooreh.com/residence/beach-apartment-for-rent-in-antalya/',
                    'https://jajooreh.com/residence/luxury-apartment-for-rent-in-antalya/',
                    'https://jajooreh.com/residence/luxury-apartment-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/2-bedroom-apartment-hotel-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/1-bedroom-hotel-apartment-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-with-biliyar-spa-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-hot-water-pool/',
                    'https://jajooreh.com/residence/rent-in-kurdan-with-indoor-pool-and-billiards/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-an-indoor-pool-2/',
                    'https://jajooreh.com/residence/5-bedroom-villa-for-rent-full-game/',
                    'https://jajooreh.com/residence/renting-a-pool-villa-with-steam-and-dry-sauna/',
                    'https://jajooreh.com/residence/renting-a-three-bedroom-villa-with-a-swimming-pool-in-sarkhrood/',
                    'https://jajooreh.com/residence/4-bedroom-villa-for-rent-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/%d8%a7%d8%ac%d8%a7%d8%b1%d9%87-%d9%88%db%8c%d9%84%d8%a7-%d8%b3%d9%87-%d8%ae%d9%88%d8%a7%d8%a8-%d9%85%d8%af%d8%b1%d9%86-%d8%a8%d8%a7-%d8%a7%d8%b3%d8%aa%d8%ae%d8%b1-%d9%88-%d8%a8%db%8c%d9%84%db%8c%d8%a7/',
                    'https://jajooreh.com/residence/four-bedroom-duplex-villa-with-jacuzzi-pool/',
                    'https://jajooreh.com/residence/a-villa-with-a-green-garden-in-razvanshahr/',
                    'https://jajooreh.com/residence/ferdows-bagh-residence-with-a-forest-view/',
                    'https://jajooreh.com/residence/clean-villa-for-rent-in-izadshahr/',
                    'https://jajooreh.com/residence/minimal-villa-for-rent-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/%d8%a7%d8%ac%d8%a7%d8%b1%d9%87-%d9%88%d9%8a%d9%84%d8%a7-%d8%a8%d8%a7-%d8%a7%d8%b3%d8%aa%d8%ae%d8%b1-%d8%a7%d8%a8-%d8%af%d8%a7%d8%ba-%d9%88-%d8%b3%d9%8a%d8%b3%d8%aa%d9%85-%d8%b5%d9%88%d8%aa%d9%8a/',
                    'https://jajooreh.com/residence/2-bedroom-villa-for-rent-with-indoor-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-with-billiards-and-indoor-pool/',
                    'https://jajooreh.com/residence/5-bedroom-villa-for-rent/',
                    'https://jajooreh.com/residence/villa-for-rent-in-rodhen-with-billiards/',
                    'https://jajooreh.com/residence/renting-a-four-bedroom-villa-with-a-spa-pool/',
                    'https://jajooreh.com/residence/full-villa-for-rent-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-indoor-pool-and-spa/',
                    'https://jajooreh.com/residence/three-bedroom-duplex-villa-with-spa-pool/',
                    'https://jajooreh.com/residence/4-bedroom-luxury-villa-for-rent/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kordan-3-bedrooms-indoor-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-southern-kordan-full-spa-pool/',
                    'https://jajooreh.com/residence/new-construction-3-bedrooms-open-air-pool-hot-water-modern/',
                    'https://jajooreh.com/residence/renting-a-villa-in-kurdan-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/renting-a-triplex-villa-with-a-private-river-in-kurdan/',
                    'https://jajooreh.com/residence/golestan-mansion-for-rent-in-kurdan-is-very-special/',
                    'https://jajooreh.com/residence/daily-rent-of-a-villa-in-rodhen-with-a-spa-pool/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-with-indoor-pool-in-kurdan/',
                    'https://jajooreh.com/residence/duplex-villa-for-rent-with-indoor-pool/',
                    'https://jajooreh.com/residence/three-bedroom-villa-for-rent-with-full-facilities/',
                    'https://jajooreh.com/residence/newly-built-modern-duplex-villa-for-rent-in-kordan/',
                    'https://jajooreh.com/residence/villa-for-rent-with-indoor-pool-and-billiards-in-kordan/',
                    'https://jajooreh.com/residence/modern-villa-for-rent-in-sarkhrood-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/villa-with-indoor-spa-pool-and-billiards/',
                    'https://jajooreh.com/residence/triplex-super-luxury-indoor-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/4-bedroom-villa-for-rent-with-indoor-pool-2/',
                    'https://jajooreh.com/residence/rent-a-villa-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/rent-a-villa-with-a-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/villa-2-for-rent-with-a-pool-spa-jacuzzi-in-kurdan/',
                    'https://jajooreh.com/residence/newly-built-modern-villa-for-rent-in-kurdan/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-with-indoor-pool-in-kordan/',
                    'https://jajooreh.com/residence/2-chambres-piscine-interieure-moderne-a-kordan/',
                    'https://jajooreh.com/residence/villa-for-rent-with-indoor-pool-and-jacuzzi-in-kurdan/',
                    'https://jajooreh.com/residence/3-bedroom-apartment-for-rent-in-istanbul/',
                    'https://jajooreh.com/residence/rent-a-modern-villa-with-a-heated-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-with-modern-billiards-in-kurdan/',
                    'https://jajooreh.com/residence/rent-a-villa-with-an-outdoor-spa-pool/',
                    'https://jajooreh.com/residence/renting-a-villa-in-mahmood-abad-jangli/',
                    'https://jajooreh.com/residence/renting-a-villa-with-pool-and-jacuzzi/',
                    'https://jajooreh.com/residence/renting-a-villa-for-guests-and-birthdays-in-shahryar/',
                    'https://jajooreh.com/residence/2-bedroom-villa-for-rent-in-mahmudabad/',
                    'https://jajooreh.com/residence/villa-rodhen-triplex-4-bedrooms-spa-pool/',
                    'https://jajooreh.com/residence/rent-a-villa-with-an-indoor-pool-in-kordan/',
                    'https://jajooreh.com/residence/rent-a-villa-with-an-indoor-pool-in-kordan-2/',
                    'https://jajooreh.com/residence/renting-a-duplex-villa-with-a-sauna-and-a-jacuzzi/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kurdan-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-ramsar-with-an-indoor-pool/',
                    'https://jajooreh.com/residence/villa-for-rent-in-kalardasht-with-a-great-view/',
                    'https://jajooreh.com/residence/two-bedroom-duplex-villa-for-rent/',
                    'https://jajooreh.com/residence/3-bedroom-villa-for-rent-with-pool/',
                    'https://jajooreh.com/residence/shahraki-noor-forest-villa-with-hot-water-pool/',
                    'https://jajooreh.com/residence/renting-a-villa-in-the-town-of-darya-sahili-khaneh/',
                    'https://jajooreh.com/residence/villa-for-rent-in-mahmudabad-with-indoor-pool/',
                    'https://jajooreh.com/residence/modern-triplex-villa-for-rent-with-swimming-pool-in-rodhen/',
                    'https://jajooreh.com/residence/villa-with-indoor-pool-and-billiards/',
                    'https://jajooreh.com/residence/%d8%a7%d8%ac%d8%a7%d8%b1%d9%87-%d9%88%db%8c%d9%84%d8%a7-%d8%a8%d8%a7-%d8%a7%d8%b3%d8%aa%d8%ae%d8%b1-%d8%a2%d8%a8%da%af%d8%b1%d9%85-%d9%88-%d8%a8%db%8c%d9%84%db%8c%d8%a7%d8%b1%d8%af/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli-2/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-sisli-nisantasi/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-with-special-sisli-decoration/',
                    'https://jajooreh.com/residence/apartment-for-rent-in-istanbul-with-special-sisli-decoration-2/',
                    'https://jajooreh.com/residence/11-duplex-apartment-with-sisli-terrace/',
                ];

                // insert prooduct links to unvisited
                for (let j = 0; j < productsUrls.length; j++) {
                    try {
                        const url = productsUrls[j];
                        await insertUrl(url);
                        await delay(250);
                    } catch (error) {
                        console.log('Error in findAllProductsLinks for loop:', error.message);
                    }
                }

                nextPageBtn = await page.$$('notFound');
                if (nextPageBtn.length) {
                    let btn = nextPageBtn[0];
                    await btn.click();
                }
                await delay(5000);
            } while (nextPageBtn.length);
        } catch (error) {
            console.log('Error In findAllProductsLinks function', error);
        }
    }
}

// ============================================ Main
async function main() {
    try {
        const INITIAL_PAGE_URL = ['https://jajooreh.com/'];

        // get random proxy
        const proxyList = [''];
        const randomProxy = getRandomElement(proxyList);

        // Lunch Browser
        const browser = await getBrowser(randomProxy, true, false);
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        for (const u of INITIAL_PAGE_URL) {
            const mainLinks = await findAllMainLinks(page, u);
            // const AllPagesLinks = await findAllPagesLinks(page, mainLinks);
            await findAllProductsLinks(page, mainLinks);
        }

        // Close page and browser
        console.log('End');
        await page.close();
        await browser.close();
    } catch (error) {
        console.log('Error In main Function', error);
    }
}

main();
