select * from ( select url,origin,id,description,category,auto from urllist  where auto = false  and checked = false
	limit (ceil(#LIMIT# * (select count(*) from urllist where auto = false and checked = false) 
		/ ( (select count(*) from urllist where auto = false and checked = false) + 
		(select count(*) from urllist where auto = true and checked = false) )))  ) as "MANUAL"
union
select * from (select url,origin,id,description,category,auto from urllist  where auto = true and checked = false
	limit (#LIMIT# -ceil(#LIMIT# * (select count(*) from urllist where auto = false and checked = false) 
		/ ( (select count(*) from urllist where auto = false and checked = false) +
	(select count(*) from urllist where auto = true and checked = false) )))   ) as "AUTO";