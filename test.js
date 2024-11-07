const { CdpDialog } = require("puppeteer");
const { v4: uuidv4 } = require("uuid");

const uuids = []
for(let i = 0; i < 100; i++){
    const uuid = uuidv4().replace(/-/g, "");
    uuids.push(uuid);

}

console.log(uuids)
