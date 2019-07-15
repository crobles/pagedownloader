#!/bin/bash

touch estadisticas.txt
echo '' > estadisticas.txt
echo 'Cantidad de paginas de productos:' >> estadisticas.txt

gsutil ls -l "gs://mm-input-store/input/Product*" > product_total_file
grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" product_total_file | sort |  uniq -c >> estadisticas.txt

echo '' >> estadisticas.txt
echo 'Cantidad de paginas de sellers:' >> estadisticas.txt

gsutil ls -l "gs://mm-input-store/input/Seller*" > seller_total_file
grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" seller_total_file | sort |  uniq -c >> estadisticas.txt

echo '' >> estadisticas.txt
echo 'Cantidad total de paginas descargadas:' >> estadisticas.txt

gsutil ls -l "gs://mm-input-store/input/*.html" | sort | uniq -c > count_total_file
grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" count_total_file | sort |  uniq -c >> estadisticas.txt

rm product_total_file seller_total_file count_total_file
