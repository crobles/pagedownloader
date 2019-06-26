-- Drop table

-- DROP TABLE "Scrapping".logs

CREATE TABLE "Scrapping".logs (
	id serial NOT NULL,
	message text NULL,
	createdat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"typeScrap" int4 NULL DEFAULT 0
);
