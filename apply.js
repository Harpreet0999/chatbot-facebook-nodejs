'use strict';
const request = require('request');
const config = require ('./config');
const pg = require('pg');
pg.defaults.ssl = true;

module.exports = 
{
applyjob: function(profile, userId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function(err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }

            let sql1 = `SELECT color FROM demo WHERE fb_id='${userId}' LIMIT 1`;
            client
                .query(sql1,
                    function(err, result) {
                        if (err) {
                            console.log('Query error: ' + err);
                        } else {
                            let sql;
                            if (result.rows.length === 0) {
                                sql = 'INSERT INTO demo (profile, fb_id) VALUES ($1, $2)';
                            }
                            /* else {
                                sql = 'UPDATE public.user_color SET color=$1 WHERE fb_id=$2';
                            }*/
                            client.query(sql,
                            [
                                profile,
                                userId
                            ]);
                        }
                    }
                    );

            done();
        });
        pool.end();
    
}


}