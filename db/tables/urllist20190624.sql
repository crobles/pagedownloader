-- Drop table

-- DROP TABLE "Scrapping".urllist

CREATE TABLE "Scrapping".urllist (
	url text NOT NULL,
	description text NULL DEFAULT 'No Description'::text,
	category text NULL DEFAULT 'No category'::text,
	origin varchar(10) NOT NULL,
	checked bool NULL DEFAULT false,
	createdat timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	updatedat timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	id serial NOT NULL,
	auto bool NULL DEFAULT true
);
CREATE UNIQUE INDEX urllist_id_idx ON "Scrapping".urllist USING btree (id);
CREATE UNIQUE INDEX urllist_url_idx ON "Scrapping".urllist USING btree (url);
