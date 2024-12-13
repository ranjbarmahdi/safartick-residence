const cheerio = require('cheerio');
const { getBrowser, getRandomElement, shuffleArray, delay, isNumeric } = require('./utils');
const db = require('./config.js');

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
        const mainLinks = [
            'https://www.jabama.com/province-east_azerbaijan',
            'https://www.jabama.com/province-west_azerbaijan',
            'https://www.jabama.com/province-ardabil',
            'https://www.jabama.com/province-isfahan',
            'https://www.jabama.com/province-alborz',
            'https://www.jabama.com/province-ilam',
            'https://www.jabama.com/province-boushehr',
            'https://www.jabama.com/stays-tehran-inn',
            'https://www.jabama.com/stays-tehran-suite',
            'https://www.jabama.com/stays-tehran-apartment ',
            'https://www.jabama.com/stays-tehran-hostel',
            'https://www.jabama.com/province-chaharmahal_bakhtiari',
            'https://www.jabama.com/province-south_khorasan',
            'https://www.jabama.com/province-khorasan_razavi',
            'https://www.jabama.com/province-north_khorasan',
            'https://www.jabama.com/province-khuzestan',
            'https://www.jabama.com/city-zanjan',
            'https://www.jabama.com/province-semnan',
            'https://www.jabama.com/province-sistan_balouchestan',
            'https://www.jabama.com/province-fars',
            'https://www.jabama.com/province-ghazvin',
            'https://www.jabama.com/province-ghom',
            'https://www.jabama.com/province-kurdistan',
            'https://www.jabama.com/province-kerman',
            'https://www.jabama.com/province-kermanshah',
            'https://www.jabama.com/province-kohgiluyeh_boyer_ahmad',
            'https://www.jabama.com/province-golestan',
            'https://www.jabama.com/province-gilan',
            'https://www.jabama.com/province-lorestan',
            'https://www.jabama.com/province-mazandaran',
            'https://www.jabama.com/province-markazi',
            'https://www.jabama.com/province-hormozgan',
            'https://www.jabama.com/province-hamedan',
            'https://www.jabama.com/province-yazd',
        ];

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
            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls
            try {
                await page.waitForSelector('.pagination > nav > a', { timeout: 120000 });
            } catch (error) {
                console.log('not found pagination');
            }

            const paginationElement = $('.pagination');
            if (paginationElement.length) {
                lsatPageNumber = Math.max(
                    ...$('.pagination > nav > a')
                        .filter((i, e) => isNumeric($(e).text().trim()))
                        .map((i, e) => Number($(e).text().trim()))
                        .get()
                );
                if (lsatPageNumber > 312) {
                    lsatPageNumber = 312;
                }
                console.log('lsatPageNumber :', lsatPageNumber);
                for (let j = 1; j <= lsatPageNumber; j++) {
                    const newUrl = url + `?page-number=${j}`;
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
                const productsUrls = $('.plp-items > li > a')
                    .map((i, e) => 'https://www.jabama.com' + $(e).attr('href'))
                    .get();

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
        const INITIAL_PAGE_URL = ['https://www.jabama.com'];

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
            const AllPagesLinks = await findAllPagesLinks(page, mainLinks);
            await findAllProductsLinks(page, AllPagesLinks);
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
