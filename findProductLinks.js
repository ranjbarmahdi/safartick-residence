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
            'https://www.homsa.net/province-east-azerbaijan',
            'https://www.homsa.net/province-west-azerbaijan',
            'https://www.homsa.net/province-ardabil',
            'https://www.homsa.net/province-isfahan',
            'https://www.homsa.net/province-alborz',
            'https://www.homsa.net/province-ilam',
            'https://www.homsa.net/province-bushehr',
            'https://www.homsa.net/province-tehran',
            'https://www.homsa.net/province-chaharmahal-and-bakhtiari',
            'https://www.homsa.net/province-south-khorasan',
            'https://www.homsa.net/province-razavi-khorasan',
            'https://www.homsa.net/province-north-khorasan',
            'https://www.homsa.net/province-khuzestan',
            'https://www.homsa.net/province-zanjan',
            'https://www.homsa.net/province-semnan',
            'https://www.homsa.net/province-sistan-and-baluchestan',
            'https://www.homsa.net/province-fars',
            'https://www.homsa.net/province-qazvin',
            'https://www.homsa.net/province-qom',
            'https://www.homsa.net/province-kurdistan',
            'https://www.homsa.net/province-kerman',
            'https://www.homsa.net/province-kermanshah',
            'https://www.homsa.net/province-kohgiluyeh-and-boyer-ahmad',
            'https://www.homsa.net/province-golestan',
            'https://www.homsa.net/province-gilan',
            'https://www.homsa.net/province-lorestan',
            'https://www.homsa.net/province-mazandaran',
            'https://www.homsa.net/province-markazi',
            'https://www.homsa.net/province-hormozgan',
            'https://www.homsa.net/province-hamedan',
            'https://www.homsa.net/province-yazd',
        ];

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(...mainLinks);
    } catch (error) {
        console.log('Error In findAllMainLinks function', error.message);
    }

    return Array.from(new Set(allMainLinks));
}

function getLastPageNumber(text) {
    // Normalize spaces and strip unwanted characters
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // Use a regular expression to extract numbers
    const numberPattern = /(\d+)\s*[\–-]\s*(\d+)\s+\D+(\d+)/;
    const match = normalizedText.match(numberPattern);

    if (match && match[3]) {
        // The total number of items is expected as the third capture group
        const totalItems = parseInt(match[3], 10);

        // Calculate the last page number
        const itemsPerPage = 24;
        const lastPageNumber = Math.ceil(totalItems / itemsPerPage);

        return lastPageNumber;
    }

    // If the pattern doesn't match, return null or throw an error
    console.error('Could not extract total items from text.');
    return null;
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

            await delay(20000);
            // find last page number and preduce other pages urls

            try {
                await page.waitForSelector('p.ng-binding', { timeout: 120000 });
            } catch (error) {
                console.log('not found pagination');
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            const paginationElement = $('p.ng-binding');
            if (paginationElement.length) {
                const t = $('p.ng-binding').text().replace(/\s+/g, ' ').trim();
                let lsatPageNumber = getLastPageNumber(t);
                console.log(`lsatPageNumber = ${lsatPageNumber}`);
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

            try {
                await page.waitForSelector('a.room-card-link', { timeout: 20000 });
                console.log('Selector found!');
            } catch (error) {
                console.error('Selector not found or an error occurred');
            }

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);
                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = $('a.room-card-link')
                    .map((i, e) => $(e).attr('href'))
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
        const INITIAL_PAGE_URL = ['https://www.homsa.net/'];

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
