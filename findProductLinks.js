const cheerio = require('cheerio');
const {
    getBrowser,
    getRandomElement,
    shuffleArray,
    delay,
    isNumeric,
    convertToEnglishNumber,
} = require('./utils');
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
            'https://www.mihmansho.com/property/azs',
            'https://www.mihmansho.com/property/azg',
            'https://www.mihmansho.com/property/ard',
            'https://www.mihmansho.com/property/esf',
            'https://www.mihmansho.com/property/alb',
            'https://www.mihmansho.com/property/ilm',
            'https://www.mihmansho.com/property/bus',
            'https://www.mihmansho.com/property/teh',
            'https://www.mihmansho.com/property/cha',
            'https://www.mihmansho.com/property/khj',
            'https://www.mihmansho.com/property/khr',
            'https://www.mihmansho.com/property/khs',
            'https://www.mihmansho.com/property/khz',
            'https://www.mihmansho.com/property/zan',
            'https://www.mihmansho.com/property/sem',
            'https://www.mihmansho.com/property/sis',
            'https://www.mihmansho.com/property/frs',
            'https://www.mihmansho.com/property/qaz',
            'https://www.mihmansho.com/property/qom',
            'https://www.mihmansho.com/property/kur',
            'https://www.mihmansho.com/property/ker',
            'https://www.mihmansho.com/property/krs',
            'https://www.mihmansho.com/property/koh',
            'https://www.mihmansho.com/property/gol',
            'https://www.mihmansho.com/property/gil',
            'https://www.mihmansho.com/property/lor',
            'https://www.mihmansho.com/property/maz',
            'https://www.mihmansho.com/property/mar',
            'https://www.mihmansho.com/property/hor',
            'https://www.mihmansho.com/property/ham',
            'https://www.mihmansho.com/property/yaz',
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

            try {
                await page.waitForSelector('ul.pagination', { timeout: 10000 });
                console.log('Selector found!');
            } catch (error) {
                console.error('Selector not found or an error occurred:', error);
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls
            const paginationElement = $('ul.pagination > li');
            if (paginationElement.length) {
                lsatPageNumber = Math.max(
                    ...$('ul.pagination > li')
                        .map((i, e) => convertToEnglishNumber($(e).text().trim()))
                        .get()
                        .filter((item) => isNumeric(item))
                        .map((item) => Number(item))
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

                try {
                    await page.waitForSelector('#result-list > li > div.box .right-p > a', {
                        timeout: 10000,
                    });
                    console.log('Selector found!');
                } catch (error) {
                    console.error('Selector not found or an error occurred:', error);
                }

                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = $('#result-list > li > div.box .right-p > a:first-child')
                    .map((i, e) => 'https://www.mihmansho.com' + $(e).attr('href'))
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
        const INITIAL_PAGE_URL = ['https://www.mihmansho.com/'];

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
