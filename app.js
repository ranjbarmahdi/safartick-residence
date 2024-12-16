const {
    getBrowser,
    getRandomElement,
    delay,
    checkMemoryCpu,
    downloadImages,
    convertToEnglishNumber,
    persionMonthToDigit,
    click,
} = require('./utils');
const omitEmpty = require('omit-empty');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./config.js');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const os = require('os');
// const cron = require('node-cron');
// const CronJob = require('cron').CronJob;

// ============================================ existsUrl
async function existsUrl() {
    const existsQuery = `
        SELECT * FROM unvisited u 
        limit 1
    `;
    try {
        const urlRow = await db.oneOrNone(existsQuery);
        if (urlRow) return true;
        return false;
    } catch (error) {
        console.log('we have no url', error);
    }
}

// ============================================ removeUrl
async function removeUrl() {
    const existsQuery = `
        SELECT * FROM unvisited u 
        ORDER BY RANDOM()
        limit 1
    `;
    const deleteQuery = `
          DELETE FROM unvisited 
          WHERE id=$1
     `;
    try {
        const urlRow = await db.oneOrNone(existsQuery);
        // if (urlRow) {
        //     await db.query(deleteQuery, [urlRow.id]);
        // }
        return urlRow;
    } catch (error) {
        console.log('we have no url', error);
    }
}

// ============================================ insertUrlToProblem
async function insertUrlToProblem(url) {
    const existsQuery = `
        SELECT * FROM problem u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO problem ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insertUrlToProblem  function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ insertUrlToVisited
async function insertUrlToVisited(url) {
    const existsQuery = `
        SELECT * FROM visited u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO visited ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insertUrlToVisited function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ insertResidence
async function insertResidence(queryValues) {
    const query = `
          insert into residence ("sku", "url", "name", "city", "province", "description", "facilities", "capacity", "room_count", "amenities", "rules", "host_name", "contact_number", "average_rating")
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertResidence :', error);
    }
}

// ============================================ insertPrice
async function insertPrice(queryValues) {
    const query = `
          insert into price ("sku" ,"url", "date", "price", "is_instant")
          values ($1, $2, $3, $4, $5)
     `;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertPrice :', error.message);
    }
}

// ============================================ insertComment
async function insertComment(queryValues) {
    const query = `
          insert into comment ("sku" ,"username", "comment_date", "comment_text", "rating")
          values ($1, $2, $3, $4, $5)
     `;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertComment :', error.message);
    }
}

// ============================================ findMinPrice
async function getPrice(page, xpaths, currency) {
    let price = Infinity;
    let xpath = '';
    try {
        if (xpaths.length == 0) {
            return [price, xpath];
        }

        // Find Price
        for (const _xpath of xpaths) {
            try {
                const priceElements = await page.$x(_xpath);
                if (priceElements.length) {
                    let priceText = await page.evaluate(
                        (elem) => elem.textContent?.replace(/[^\u06F0-\u06F90-9]/g, ''),
                        priceElements[0]
                    );
                    priceText = convertToEnglishNumber(priceText);
                    let priceNumber = currency ? Number(priceText) : Number(priceText) * 10;
                    if (priceNumber < price && priceNumber !== 0) {
                        price = priceNumber;
                        xpath = _xpath;
                    }
                }
            } catch (error) {
                console.log('Error in getPrice Function Foor Loop :', error.message);
            }
        }
    } catch (error) {
        console.log('Error In getPrice :', error);
    } finally {
        return [price, xpath];
    }
}

// ============================================ scrapResidence
async function scrapResidence(page, residenceURL, imagesDIR) {
    try {
        console.log(`======================== Start scraping : \n${residenceURL}\n`);
        start = new Date();

        // Go To Url
        await page.goto(residenceURL, { timeout: 180000 });

        await delay(5000);

        let html = await page.content();
        let $ = cheerio.load(html);

        const data = {};

        data['sku'] = uuidv4().replace(/-/g, '');

        data['url'] = residenceURL;

        data['name'] = $('h1').text().trim() ? $('h1').text().trim() : null;

        data['city'] = $('div.box-title .fourty-space > a:first').text()?.trim() || null;

        data['province'] = $('div.box-title .fourty-space > a:last').text()?.trim() || null;

        data['description'] =
            $('#details-f')
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        const facilities = {};
        data['facilities'] =
            $('.features-home.fsf > div > div')
                .map((i, e) => {
                    const title = $(e).text().split(':')[0]?.trim();
                    const ambients = $(e).text().split(':')[1]?.trim();
                    facilities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        if ('کد اقامتگاه' in facilities) {
            delete facilities['کد اقامتگاه'];
        }

        data['capacity'] = facilities['حداکثر ظرفیت'] || null;

        data['room_count'] = facilities['تعداد اتاق'] || null;

        const amenities = {};
        data['amenities'] =
            $('.amenities > li.features')
                .map((i, e) => {
                    const title = $(e).find('> span > span.feature-attribute-name').text()?.trim();

                    const hasntThisFeature = $(e).find('> span:first').hasClass('not-active-f');

                    const ambients = hasntThisFeature
                        ? 'ندارد'
                        : $(e)
                              .find('.feature-description')
                              .map((i, e) => $(e).text()?.trim())
                              .get()
                              .join('\n') || 'دارد';

                    amenities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        const rules = {};
        const hostRules =
            $('li.rules:not(.hidden) > span')
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        if (hostRules) {
            rules['قوانین میزبان'] = hostRules;
        }

        const cancelRules =
            $('.cancel-rule-list > li')
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;
        if (cancelRules) {
            rules['قوانین کنسلی'] = cancelRules;
        }

        data['rules'] =
            Object.keys(rules)
                .map((key) => `${key}:\n${rules[key]}`)
                .join('\n\n') || null;

        data['host_name'] =
            $('#about-host > .user-profile .user-profile-name > a').text().trim() || null;

        data['contact_number'] = $('selector').text().trim() ? $('selector').text().trim() : null;

        // Calendar
        const calendar = [];
        $('.cal-item').map((i, e) => {
            let month = $(e).find('> .month-name').text().split(' ')[0]?.trim();
            let year = $(e).find('> .month-name').text().split(' ')[1]?.trim();
            const monthDigit = persionMonthToDigit(month);
            const yearDigit = convertToEnglishNumber(year);
            const reservable = $(e)
                .find('td[class]:not(.date-passed, .unavailable, .next-month, .prev-month)')
                .map((i, e) => {
                    const day = convertToEnglishNumber($(e).attr('data-day')?.trim());

                    const priceText = $(e).find('.price-text:first').text();
                    const discountText = $(e).find('.price-text > del').text();
                    const finalPriceText = priceText.replace(discountText, '')?.trim();
                    let price = convertToEnglishNumber(
                        $(e).find('.price-text:first').attr('data-price')
                    );
                    // if (price) {
                    //     price *= 1000;
                    // }
                    const date = `${yearDigit}\/${monthDigit}\/${day}`;
                    const available = true;
                    let is_instant = $(e).hasClass('reserveReady');
                    calendar.push({ date, price, available, is_instant });
                });
        });

        data['calendar'] = calendar;

        // Comments
        const average_rating = {};
        if ($('#secondary .details .rated-top .rate-val:first').length) {
            average_rating['امتیاز کلی'] = $('#secondary .details .rated-top .rate-val:first')
                .text()
                ?.trim();
        }

        $('#comments .rates > div').map((i, e) => {
            const title = $(e).find('.rate-label:last').text()?.trim();
            const value = $(e).find('.rate-val:last').text()?.trim();
            average_rating[title] = value;
            return `${title}:${value}`;
        });

        data['average_rating'] =
            Object.keys(average_rating)
                .map((key) => `${key}:${average_rating[key]}`)
                .join('\n') || null;

        await click(page, '#comments a.btn-more-comment');
        await delay(3000);

        html = await page.content();
        $ = cheerio.load(html);

        const comments = [];
        $(
            '.Modal_content__j50DE > div > .RoomComments_ModalComments__sUK1a > .RoomComments_commentContainer__ouzGE'
        ).map((i, e) => {
            const username =
                $(e)
                    .find(
                        '.RoomComments_profileSection__TF6d0 > .RoomComments_profile__G1Ueg > div > .Typography_subtitle3__CujCe '
                    )
                    .text()
                    ?.trim() || null;

            let rating =
                $(e)
                    .find(
                        '.RoomComments_profileSection__TF6d0 > .RoomComments_rate__Ko6e0 > .Typography_subtitle3__CujCe'
                    )
                    .text()
                    ?.trim() || null;

            let comment_date =
                $(e)
                    .find(
                        '.RoomComments_profileSection__TF6d0 > .RoomComments_profile__G1Ueg > div > .Typography_body3__qkN_x '
                    )
                    .text()
                    ?.trim() || null;

            const comment_text = $(e)
                .find('.RoomComments_commentBody__qyP21 > span')
                .filter((i, e) => $(e).text()?.trim())
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n');
            comments.push({ username, rating, comment_date, comment_text });
        });

        data['comments'] = comments;

        // Download Images
        // const image_xpaths = ['//*[@id="Images"]//div[contains(@class, "Images_master__a6x_z")]'];

        let imageUrls = $('#Images > .Images_master__a6x_z:not(.Images_tagsView__doiGA) > img')
            .map((i, e) => $(e).attr('src')?.replace('X500', 'Medium')?.trim())
            .get();

        imageUrls = imageUrls.flat();
        imageUrls = [...new Set(imageUrls)];
        console.log('Download Images');
        await downloadImages(imageUrls, imagesDIR, data.sku);

        return data;
    } catch (error) {
        console.log('Error In scrapResidence in page.goto', error);
        await insertUrlToProblem(residenceURL);
        return null;
    }
}

// ============================================ Main
async function main() {
    let urlRow;
    let browser;
    let page;
    console.time();
    try {
        const DATA_DIR = path.normalize(__dirname + `/${process.env.DIRECTORY_NAME}`);
        const IMAGES_DIR = path.normalize(DATA_DIR + '/images');

        // Create SteelAlborz Directory If Not Exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        if (!fs.existsSync(IMAGES_DIR)) {
            fs.mkdirSync(IMAGES_DIR);
        }

        // get product page url from db
        urlRow = await removeUrl();

        if (urlRow?.url) {
            // get random proxy
            const proxyList = [''];
            const randomProxy = getRandomElement(proxyList);

            // Lunch Browser
            await delay(Math.random() * 4000);
            browser = await getBrowser(randomProxy, true, false);
            page = await browser.newPage();
            await page.setViewport({
                width: 1440,
                height: 810,
            });

            const residenceInfo = await scrapResidence(page, urlRow.url, IMAGES_DIR);
            const insertQueryInput = [
                residenceInfo.sku,
                residenceInfo.url,
                residenceInfo.name,
                residenceInfo.city,
                residenceInfo.province,
                residenceInfo.description,
                residenceInfo.facilities,
                residenceInfo.capacity,
                residenceInfo.room_count,
                residenceInfo.amenities,
                residenceInfo.rules,
                residenceInfo.host_name,
                residenceInfo.contact_number,
                residenceInfo.average_rating,
            ];

            // if exists ResidenceInfo insert it to Residences
            if (residenceInfo) {
                await insertResidence(insertQueryInput);
                await insertUrlToVisited(urlRow?.url);

                console.log('Insert Prices');
                const calendar = residenceInfo.calendar;
                const calendarPromises = calendar.map(({ date, price, is_instant }) =>
                    insertPrice([residenceInfo.sku, residenceInfo.url, date, price, is_instant])
                );

                await Promise.all(calendarPromises);

                console.log('Insert Comments');
                const comments = residenceInfo.comments;
                const commentsPromises = comments.map(
                    ({ username, rating, comment_date, comment_text }) =>
                        insertComment([
                            residenceInfo.sku,
                            username,
                            comment_date,
                            comment_text,
                            rating,
                        ])
                );

                await Promise.all(commentsPromises);
            }
        }
    } catch (error) {
        console.log('Error In main Function', error);
        await insertUrlToProblem(urlRow?.url);
    } finally {
        // Close page and browser
        console.timeEnd();
        console.log('End');
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

// ============================================ run_1
async function run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    if (checkMemoryCpu(memoryUsagePercentage, cpuUsagePercentage, usageMemory)) {
        await main();
    } else {
        const status = `status:
          memory usage = ${usageMemory}
          percentage of memory usage = ${memoryUsagePercentage}
          percentage of cpu usage = ${cpuUsagePercentage}\n`;

        console.log('main function does not run.\n');
        console.log(status);
    }
}

// ============================================ run_2
async function run_2(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    let urlExists;

    do {
        urlExists = await existsUrl();
        if (urlExists) {
            await run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory);
        }
    } while (urlExists);
}

// ============================================ Job

// stopTime = 8000
// let job = new CronJob('*/3 * * * * *', async () => {

//      console.log("cron");
//      let usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
//      let memoryUsagePercentage = checkMemoryUsage();
//      let cpuUsagePercentage = await getCpuUsagePercentage();

//      if (usageMemory >= 13 || cpuUsagePercentage >= 90) {
//           console.log("=========================================");
//           console.log(`job stopped for ${stopTime} ms`);
//           job.stop();

//           setInterval(() => {
//                console.log(`Restarting cron job after ${stopTime} ms...`)
//                job.start();
//           }, stopTime)
//      }

//      if (memoryUsagePercentage <= 80 && cpuUsagePercentage <= 85) {
//           main();
//           console.log("main");
//      }

// })

// job.start()

// run_1(80, 80, 20);
run_2(80, 80, 20);
