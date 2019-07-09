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
	id serial NOT NULL
);
CREATE UNIQUE INDEX urllist_id_idx ON "Scrapping".urllist USING btree (id);
CREATE UNIQUE INDEX urllist_url_idx ON "Scrapping".urllist USING btree (url);
COMMENT ON TABLE "Scrapping".urllist IS 'last alter 20190513';

-- Permissions

ALTER TABLE "Scrapping".urllist OWNER TO postgres;
GRANT ALL ON TABLE "Scrapping".urllist TO postgres;
