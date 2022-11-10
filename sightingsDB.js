/*
Interface to sightings local sqlite3 db
*/

import sqlite3 from "sqlite3";

async function checkSighting(sighting_number) {
    const db = new sqlite3.Database("./local.db");
    let isPresent = false;
    console.log(sighting_number);
    await db.serialize(() => {
        db.all("SELECT * FROM sightings WHERE case_number = ?", sighting_number, (err, rows) => {
            if (err) {
                console.error(err);
            }
            
            if(rows.length > 0) {
                console.log('found!');
                isPresent = true;
            }
        });
    });

    db.close();

    return isPresent;
}

function addSighting(sighting) {
    console.log("prepare to add sighting # "+sighting.case_number);
    let sightingValues = Object.values(sighting);
    console.log(sightingValues)
    const db = new sqlite3.Database("./local.db");
    db.serialize(() => {
        db.all(
            "INSERT INTO sightings (case_number,date_submitted,date_event,short_description,city,state_country,attachments,toot,posted) VALUES (?,?,?,?,?,?,?,?,FALSE)",
            sightingValues,
            (err, rows) => {
                if(err) {
                    console.log(err);
                }

                console.log("added sighting # "+sighting.case_number);
            }
        );
    });
}

export {addSighting as default}