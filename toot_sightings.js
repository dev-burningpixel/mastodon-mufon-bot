/*
Toot out sightings
*/

import sqlite3 from "sqlite3";
import * as dotenv from "dotenv";
dotenv.config();
import * as masto from "masto";

// sleep to add wait to for loop
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// loops through rows and toots in 3 (was 10) minutes spaces
async function smartTooter(rows) {
    for(let i = 0; i < rows.length; i++) {
        console.log("iterator @ " + i.toString());
        let now = new Date();
        const rowData = rows[i];
        let mastoClient;

        try {
            console.log(process.env.ACCESSKEY);
            mastoClient = await masto.login({
                url: 'https://free.burningpixel.net',
                accessToken: process.env.ACCESSKEY,
                disableVersionCheck: true
            });
        } catch (err) {
            console.error(err);
            return;
        }


        console.log("writing post @ " + now.toLocaleString());
        console.log(rowData["toot"]);

        await mastoClient.statuses.create({
            status: rowData["toot"],
            visibility: 'public',
        });


        console.log("waiting 3 minutes 180000 ms...");
        await sleep(180000);
    }
    
    console.log("all sightings have been tooted...")
}

// toot out sightings for the day
async function tootSightings() {
    const db = new sqlite3.Database("./local.db");
    await db.all("SELECT * FROM sightings WHERE DATE('now') >= DATE(date_submitted) AND DATE(date_submitted) >= DATE('now', '-1 day') AND posted IS FALSE", [], (err, rows) => {
        if (err) {
            console.error(err);
        }

        if (rows.length > 0) {
            console.log("writing " + rows.length.toString() + " toots");
            smartTooter(rows);

            console.log("marking sightings as posted");
            for (let i = 0; i < rows.length; i++) {
                db.all("UPDATE sightings SET posted=TRUE WHERE case_number = ?", rows[i]["case_number"], (err, rows2) => {
                    if (err) {
                        console.error(err);
                    }

                    console.log(rows[i]["case_number"].toString() + " marked posted");
                });
            }
        } else {
            console.log("No toots to write...\n");
        }
    });
}

async function main() {
    await tootSightings();
}

try {
    console.log("\ntooting out any new sightings...")
    main();
} catch (err) {
    console.error(err);
}