/*
MUFON Last 20 Reports bot for Mastodon

Downloads list from https://mufoncms.com/last_20_report_public.html and posts today's sightings

Using cron, run once a day to download list at 4:20AM

table sightings

CREATE TABLE sightings (
    case_id INTEGER PRIMARY KEY,
    case_number INTEGER NOT NULL,
    date_submitted TEXT NOT NULL,
    date_event TEXT,
    short_description TEXT,
    city TEXT,
    state_country TEXT,
    attachments TEXT,
    toot TEXT,
    posted BOOL
);
*/

import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import addSighting from "./sightingsDB.js";
import sqlite3 from "sqlite3";
import * as dotenv from "dotenv";
dotenv.config();
import * as masto from "masto";

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function getSightings() {
    // download html data and parse
    // then check if to add the sighting to the local db

    let mufonResp = null;
    let mufonBody = null;

    try {
        mufonResp = await fetch("https://mufoncms.com/last_20_report_public.html");
    } catch (err) {
        console.error(err);
        return;
    }

    if (mufonResp && mufonResp.status == 200) {
        console.log("parsing last_20_report_public.html");

        try {
            mufonBody = await mufonResp.text();

            if (mufonBody) {
                console.log(mufonBody);
                const mufonParser = new JSDOM(mufonBody);
                const mufonDOM = mufonParser.window.document;

                let reportRows = mufonDOM.querySelectorAll("table tr");

                // since the table is the same thing, for now, skip first two table rows found
                // which is just the headers
                for (let i = 2; i < reportRows.length; i++) {
                    let rowData = reportRows[i];
                    console.log("\n[" + i.toString() + "] =======")
                    let splitData = rowData.textContent.split("\n");

                    // knowing the structure, the data is between 1-7
                    let sighting = {
                        "case_number": parseInt(splitData[1]),
                        "date_submitted": splitData[2].replace(/\s+/g, ' ').trim(),
                        "date_event": splitData[3].replace(/\s+/g, ' ').trim(),
                        "short_description": splitData[4].replace(/\s+/g, ' ').trim(),
                        "city": splitData[5].replace(/\s+/g, ' ').trim(),
                        "state_country": splitData[6].replace(/\s+/g, ' ').trim(),
                        "attachments": splitData[7].replace(/\s+/g, ' ').trim()
                    };

                    let sighting_post = "[case number] " + sighting["case_number"] + "\n";
                    sighting_post += "[date submitted] " + sighting["date_submitted"];

                    if (sighting["date_event"] != "") {
                        sighting_post += "\n[data of event] " + sighting["date_event"] + "\n";
                    } else {
                        sighting_post += "\n[data of event] none\n";
                    }

                    sighting_post += "[city] " + sighting["city"] + "\n[state/country] " + sighting["state_country"] + "\n";

                    if (sighting["attachments"] != "") {
                        sighting_post += "[attachments] " + sighting["attachments"];
                    } else {
                        sighting_post += "[attachments] none";
                    }

                    sighting_post += "\n\n" + sighting["short_description"] + "\n\n";
                    sighting_post += "#ufo #mufon #ufomastodon #mufonmastodon #truthisoutthere"

                    console.log(sighting_post);

                    sighting["toot"] = sighting_post;

                    const db = new sqlite3.Database("./local.db");
                    await db.serialize(() => {
                        db.all("SELECT * FROM sightings WHERE case_number = ?", sighting.case_number, (err, rows) => {
                            if (err) {
                                console.error(err);
                            }

                            if (rows.length == 0) {
                                console.log("sending to database case #" + sighting.case_number);
                                addSighting(sighting);
                            } else {
                                console.log("skipping case #" + sighting.case_number);
                            }
                        });
                    });
                }


            }

        } catch (err) {
            console.error(err);
            return;
        }
    }
}

async function smartTooter(rows) {
    // loops through rows and toots in 3 (was 10) minutes spaces
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
    


}

async function tootSightings() {
    // toot out sightings for the day
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
            console.log("No toots to write...");
        }
    });
}

async function main() {
    await getSightings().then(async () => await tootSightings());
}


try {
    console.log("starting mufon bot...");
    main();
} catch (err) {
    console.error(err);
}