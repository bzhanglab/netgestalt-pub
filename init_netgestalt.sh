#!/bin/bash

# please run as root in NetGestalt root directory
if [ $# -ne 1 ]
then 
  echo "Usage: init_ng path_relative_to_web_server_doc_root"
fi

ng_doc_root=$1

data_dir="/tmp/ng_data"
int_data_dir="/tmp/ng_int_data"
tiles_dir="/tmp/ng_tiles"
int_data_system="int_data/system"
int_data_user="int_data/user"
data_system="data/system"
data_tile="data/tiles"
data_user="data/user"
raw_data_system="raw_data/system"

if [ ! -d ${data_dir} ]; then
  mkdir ${data_dir}
	chown apache:apache ${data_dir}
fi

if [ ! -d ${int_data_dir} ]; then
  mkdir ${int_data_dir}
	chown apache:apache ${int_data_dir}
fi

if [ ! -d ${int_data_system} ]; then
  mkdir -p ${int_data_system}
	if [ ! -L ${int_data_user} ]; then
	  ln -s ${int_data_dir} ${int_data_user}
	fi 
fi

if [ ! -d ${tiles_dir} ]; then
  mkdir ${tiles_dir}
	chown apache:apache ${tiles_dir}
fi

if [ ! -d ${data_system} ]; then
  mkdir -p ${data_system}
	if [ ! -L ${data_tile} ]; then
    ln -s ${tiles_dir} ${data_tile}
  fi
	if [ ! -L ${data_user} ]; then
	  ln -s ${data_dir} ${data_user}
  fi
fi

if [ ! -d ${raw_data_system} ]; then
  mkdir -p ${raw_data_system}
fi

sed -e "s|\$NG_DOC_ROOT|"$ng_doc_root"|g" main.html.in > main.html
sed -e "s|\$NG_DOC_ROOT|"$ng_doc_root"|g" main-full.html.in > main-full.html
