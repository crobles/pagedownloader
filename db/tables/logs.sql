-- Drop table

-- DROP TABLE "pageDownload".logs;

CREATE TABLE "pageDownload".logs (
	id serial NOT NULL,
	message text NULL,
	"typeScrap" int4 NULL,
	createdat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
