-- Drop table

-- DROP TABLE "Scrapping".logs;

CREATE TABLE "Scrapping".logs (
	id serial NOT NULL,
	message text NULL,
	"typeScrap" int4 NULL,
	createdat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
