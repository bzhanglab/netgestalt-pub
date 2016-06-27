#!/usr/bin/env python
"""
This script is called by upload.php
convert raw track data into track files to be visualized in NetGestalt
the input raw track data are in $NETGESTALT_ROOT/raw_data
the output track files will be created in $NETGESTALT_ROOT/data
Raw track data file type:
  sbt - simple binary tracks
  sct - simple contineous tracks
  cbt - composite binary track
  cct - composite contineous track
  sst - summary snapshot track

usage:
prepare_tracks.py -r $NETGESTALT_ROOT [-l $LOWER]  [-u $UPPER]
prepare_tracks.py --usernetwork --network=XXXX,YYYY --view=ZZZZ 
prepare_tracks.py -r $NETGESTATL_ROOT --usertrack --network=XXX --track=YYYY --tracktype=sbt

$NETGESTALT_ROOT: root directory of netgestalt
$LOWER:  lower threshold (percentage) for bbt 
$UPPER:  upper threshold (percentage) for bbt 

"""
import sqlite3
import getopt, sys, os
import re
import shutil
import csv
import string, random
import exceptions
import functools
import math
import gc
import json
import time

global input, inter, output
global ann_done # ann (go_bp, go_cc ...) output file now lives in intermediated directory.  Only needs to be processed once.
global track_detail_info
global label2ngid_file
global usr_track, usr_network
global root_dir
# keep track of which (cct, cbt) track has sample info file, contains track id's for those who have sample info file
global tracks_with_sample_info_file
global raw_track_data_dir
# default lower and upper threshold (absolute number of genes)
lower_limit=5
upper_limit=2000
# msm contains a cct, this cct track may not need to be generated for other network/view
global system_view_track_info  
global mapping_status

# remove duplicates from list
def remove_duplicates(l):
  return list(set(l))

def update_progress(progress, width):
  print '\r    ................. %d %% done' % progress,
  sys.stdout.flush()

def id_generator(size=40, chars=string.ascii_lowercase + string.digits):
  return ''.join(random.choice(chars) for x in range(size))

# format: secondsinceepoch_XXXXX 
def random_string(size=5, chars=string.ascii_lowercase+string.ascii_uppercase):
  seconds_since_epoch=int(time.mktime(time.gmtime()))
  s=''.join(random.choice(chars) for x in range(size))
  return str(seconds_since_epoch)+"_"+str(s)
  
#def sort_file(filename):
#  random_string=id_generator()
#  tmpfile=filename+"_"+random_string
#  tmpfile_handle=open(tmpfile,"w")
#  map(tmpfile_handle.write, sorted(file(filename).readlines()))
#  tmpfile_handle.close()
#  os.rename(tmpfile, filename)

def usage():
  # process user uploaded track, pass "-p" (called by upload.php)
  print('prepare_tracks.py -r $NETGESTALT_ROOT [-l $LOWER] [-u $UPPER] [--usertrack] [--usernetwork] [--network=XXX] [--tracktype=XXX] [--tracklabel=XXX]')

# by default: it preprocess system-network/system-tracks
def main():
  # for each .rul file in the top directory 
  global usr_track, usr_network
  global ann_done
  global tracks_with_sample_info_file
  global raw_track_data_dir
  global system_view_track_info
  global mapping_status
  ann_done=False
  usr_track=False
  usr_network=False
  input_network=[]
  input_track=[]
  tracks_with_sample_info_file=[]
  track_label=""
  my_mapping_status=""
  system_view_track_info=dict()
  mapping_status=dict()
  # user also uploaded sample info file
  sample_info=False
  view=""
  global root_dir
  if len(sys.argv)<3:
    usage()
    sys.exit(2)
  try:
    opts, args = getopt.getopt(sys.argv[1:], 'r:l:u:', ['sampleinfo','usertrack','usernetwork','track=','network=','tracktype=','tracklabel=','view=','mapping_status='])
  except getopt.GetoptError, err:
    # print help information and exit:
    print str(err) # will print something like "option -a not recognized"
    usage()
    sys.exit(2)
  for o, a in opts:
    #print(o,a)
    if o=="-r":
      root_dir=a
    elif o=="-l":
      lower_limit=int(a)
    elif o=="-u":
      upper_limit=int(a)
    elif o=="--usertrack":
      usr_track=True
    elif o=="--sampleinfo":
      sample_info=True
    elif o=="--usernetwork":
      usr_network=True
    elif o=="--track":
      input_track=a.split(',')
    elif o=="--tracktype": # all tracks should be the same type
      track_type=a
    elif o=="--tracklabel": # only for cbt and cct, ignored for sbt and sct
      track_label=a
    elif o=="--mapping_status": # only for user uploaded networks
      my_mapping_status=a
    elif o=="--network":
      input_network=a.split(',')
    elif o=="--view":
      view=a
    else:
      assert False, "unhandled option"                                                                
  global input, inter, output 
  # there is no user raw data, only intermediate user data
  input="raw_data/system"
  inter="int_data/system"
  user_int="int_data/user"
  top_output="data/"
  output=top_output+"system"
  user_output=top_output+"user"
 # make sure /tmp/ng_tiles, /tmp/ng_int_data, /tmp/ng_data exist and owned by apache
  tmpdir="/tmp/ng_tiles"
  tmp_int_dir="/tmp/ng_int_data"
  tmp_data_dir="/tmp/ng_data"
  raw_track_data_dir="raw_track_data"
  input_dir=os.path.join(root_dir, input)
  output_dir=os.path.join(root_dir, output)
  data_dir=os.path.join(root_dir, top_output)
  int_dir=os.path.join(root_dir, inter)
  user_int_dir=os.path.join(root_dir, user_int)
  user_data_dir=os.path.join(root_dir, user_output)
 # if output_dir does not exist, create it
  if not os.path.exists(output_dir): 
    os.mkdir(output_dir)
  if not os.path.exists(tmpdir):
    os.mkdir(tmpdir)
  if not os.path.exists(data_dir): 
    os.mkdir(data_dir)
  if not os.path.exists(os.path.join(data_dir,"tiles")): 
    os.symlink(tmpdir, os.path.join(data_dir,"tiles"))
  if not os.path.exists(int_dir): 
    os.mkdir(int_dir)
  if not os.path.exists(user_int_dir):
    os.symlink(tmp_int_dir, user_int_dir)
  if not os.path.exists(user_data_dir):
    os.symlink(tmp_data_dir, user_data_dir)
  if usr_track==False and usr_network==False:
    process_sys_sys(input_dir, int_dir, output_dir, tmpdir)
  elif usr_network==True and (not input_track) and input_network:
    sys_data_dir=output_dir
    process_user_network(user_output, user_int, root_dir, input_network, view, sys_data_dir, my_mapping_status)
  elif usr_track==True and usr_network==False and input_network and input_track: # system network, user track(s)
    # input_track and track_type are lists with the same length
    # track_type: 'sbt','sct','cbt','cct', 'sst'
    # the output of this function is the location of generated tracks.
    sys_data_dir=output_dir
    process_non_sys_sys(sys_data_dir, user_int_dir, user_int, root_dir, user_output, input_network, input_track, track_type, track_label, False, sample_info)
  elif usr_network==True and usr_track==False and input_track and input_network:
    # user network, system track
    process_non_sys_sys(user_data_dir, int_dir, inter, root_dir, user_output, input_network, input_track, track_type, track_label, True, sample_info)
  elif usr_network==True and usr_track==True and input_track and input_network:
    # user network, user track
    process_non_sys_sys(user_data_dir, user_int_dir, user_int, root_dir, user_output, input_network, input_track, track_type, track_label, True, sample_info)

# input_network: xxx,yyy  where xxx is the random generated name, yyy is the user provided name (upload file name sans extension).
def process_user_network(user_output, user_int, root_dir, input_network, view, sys_data_dir, mapping):
# The output will be of this format:
#   "info":{
#    "network":sdfasfd,
#    "length" : xxxx,
#    "name" : "network_real_name",
#    "type" : "user",
#    "view" : "????",
#    "end" : xxx,
#    "start" : 0,
#    "module_info" : "data/user/modules/network_name/modules",
#    "network" : "data/user/networks/network_name/network" (optional)
#  }   
  file=sys.stdout   
  network_input_dir=os.path.join(root_dir, user_int,"networks",input_network[0])
  network_output_dir=os.path.join(user_output, "networks", input_network[0])
  module_output_dir=os.path.join(user_output, "modules", input_network[0])
  if not os.path.exists(os.path.join(root_dir, network_output_dir)):
    os.makedirs(os.path.join(root_dir, network_output_dir))
  if not os.path.exists(os.path.join(root_dir, module_output_dir)):
    os.makedirs(os.path.join(root_dir, module_output_dir))
  ruler_file=open(os.path.join(network_input_dir, input_network[0])+".rul","r")
  length=0
  all_genes=[]
  for line in ruler_file:
    if RepresentsInt(line.rstrip().split('\t')[0]):
      all_genes.append(line.rstrip().split("\t")[4])
      length=length+1
  ruler_file.close()
  file.write("\"info\":{")
  file.write("\"directory\":\""+input_network[0]+"\",")
  file.write("\"length\":"+str(length)+",")
  file.write("\"name\":\""+input_network[1]+"\",")
  file.write("\"type\":\"user\",")
  file.write("\"mapping_status\":\""+mapping+"\",")
  if os.path.exists(os.path.join(network_input_dir,input_network[0]+".nsm")):
    file.write("\"kind\":\"nsm\",")
  elif os.path.exists(os.path.join(network_input_dir,input_network[0]+".msm")):
    file.write("\"kind\":\"msm\",")
  file.write("\"view\":\""+view+"\",")
  file.write("\"end\":"+str(length)+",")
  file.write("\"start\":0,")
  if os.path.exists(os.path.join(network_input_dir, input_network[0])+".hmi"):
    file.write("\"module_info\":"+"\""+module_output_dir+"/modules"+"\"")  
    # create module file
    abs_module_out=os.path.join(root_dir,module_output_dir,"modules")
    create_module_file(abs_module_out, network_input_dir, input_network[0])
  if os.path.exists(os.path.join(network_input_dir, input_network[0])+".net"):
    file.write(",\"network\":"+"\""+network_output_dir+"/network"+"\"")  
    # create netwrok file if needed
    abs_net_out_dir=os.path.join(root_dir, network_output_dir)
    create_net_file(network_input_dir, input_network[0], abs_net_out_dir) 
  # copy sbt_categories, label2ngid.json file from one of the system network
  user_sbt_categories_dir=os.path.join(user_output,"tracks",input_network[0])
  if not os.path.exists(os.path.join(root_dir, user_sbt_categories_dir)):
    os.makedirs(os.path.join(root_dir, user_sbt_categories_dir))
  # open one of the existing sbt_categories, label2ngid.json
  sys_sbt_categories_file=os.path.join(sys_data_dir,"tracks", os.listdir(os.path.join(sys_data_dir,"tracks"))[0], "sbt_categories")
  shutil.copy(sys_sbt_categories_file, os.path.join(root_dir, user_sbt_categories_dir))
  sys_label2ngid_file=os.path.join(sys_data_dir,"tracks", os.listdir(os.path.join(sys_data_dir,"tracks"))[0], "label2ngid.json")
  shutil.copy(sys_label2ngid_file, os.path.join(root_dir, user_sbt_categories_dir))
  # write one additonal category to the file
  user_sbt_categories_file=open(os.path.join(root_dir, user_sbt_categories_dir,"sbt_categories"),"a")
  user_sbt_categories_file.write(input_network[1]+"_module")
  user_sbt_categories_file.close()
  file.write(", \"sbt_categories\":"+"\""+user_sbt_categories_dir+"/sbt_categories"+"\"")  
  # copy the trackInfo file from one of the system network
  # notice that the url field is no longer valid
  info_output_dir=os.path.join(user_output, "info", input_network[0])
  if not os.path.exists(os.path.join(root_dir, info_output_dir)):
    os.makedirs(os.path.join(root_dir, info_output_dir))
  # open one of the system trackInfo.js file
  sys_info_file=os.path.join(sys_data_dir,"info", os.listdir(os.path.join(sys_data_dir,"info"))[0], "trackInfo.js")
  sys_track_info_file=open(sys_info_file)
  sys_track_info_obj=json.load(sys_track_info_file)
  info_output_file_name=os.path.join(root_dir,info_output_dir,"trackInfo.js")
  info_output_file=open(info_output_file_name, "w")
  new_sys_track_info_obj=[]
  for track in sys_track_info_obj:
    # remove ann_XX_module tracks since these are network related tracks
    matchObj=re.match('^ann_(.*)_module', track["category"])
    #if matchObj:
      #sys_track_info_obj.remove(track)
    #  continue
    if track["label"]=="name":  # this is the ruler
      track["url"]=os.path.join(user_output, "tracks", input_network[0], "0")
    else:
      track["url"]=""  # reset the url
    track["network"]=input_network[1]
    new_sys_track_info_obj.append(track)
  # create user network module track 
  user_network_module_track_info=create_user_network_module_tracks(user_output, user_int, root_dir, input_network, all_genes)
  new_sys_track_info_obj.extend(user_network_module_track_info)
  # create the ruler track
  print_ruler_track("", all_genes, input_network[0], os.path.join(root_dir, user_output, "tracks"))
  s=json.dumps(new_sys_track_info_obj)
  info_output_file.write(s)
  sys_track_info_file.close()
  info_output_file.close()
  file.write("}")
  file.close()

def create_user_network_module_tracks(user_output, user_int, root_dir, input_network, all_genes):
 # create category file in int_data/user/tracks 
 # create all module tracks in int_data/user/tracks
 # return these track info (to be appended to trackInfo.js)
  mf=open(os.path.join(root_dir, user_int,"tracks",input_network[0]),"w")
  hmi_input=open(os.path.join(root_dir, user_int, "networks", input_network[0], input_network[0]+".hmi"),"r")
  track_info=[]
  # skip the first line
  hmi_input.readline()
  for line in hmi_input:
    random_name=random_string()
    tf=open(os.path.join(root_dir,user_int,"tracks",random_name+".sbt"),"w")
    items=line.rstrip().split("\t")
    tmp_string=""
    end=int(items[5])
    start=int(items[4])
    level=items[1]
    module_order=items[2]
    yes_or_no=items[0]
    for i in range(end-start+1):
      tmp_string=tmp_string+all_genes[i-1+start]
      if i!=end-start:
        tmp_string=tmp_string+"\t" 
    label="Level"+level+"_Module"+module_order+"_"+yes_or_no
    # remove space
    newlabel=re.sub(r'\s',"", label);
    newlabel=input_network[1]+newlabel
    # remove " or '
    newlabel=re.sub("[\"\']",'',newlabel)
    mf.write(newlabel+"\t"+tmp_string+"\n")
    tf.write(label+"\t"+tmp_string+"\n")
    tf.close()
    tmpObj={}
    tmpObj["url"]=""
    tmpObj["int_url"]=user_int+"/tracks/"+random_name+".sbt"
    tmpObj["network"]=input_network[1]
    tmpObj["label"]=newlabel
    tmpObj["type"]="SimpleTrack"
    tmpObj["datatype"]="sbt"
    tmpObj["key"]=input_network[1]+"_"+label
    tmpObj["link"]="NULL"
    tmpObj["category"]="ann_"+input_network[1]+"_module"
    track_info.append(tmpObj)
  mf.close()
  hmi_input.close()
  return track_info

# only cbt and cct cares about sample_info
def process_non_sys_sys(data_dir, int_dir, inter, root_dir, user_data_rel_dir, input_network, input_track, track_type, track_label, user_network, sample_info):
  print track_type
  if track_type=='sbt':
    process_my_sbt(data_dir, int_dir, inter, root_dir, user_data_rel_dir, input_network, input_track, user_network)
  elif track_type=='sct':
    process_my_sct(data_dir, int_dir, inter, root_dir, user_data_rel_dir, input_network, input_track, user_network)
  elif track_type=='cbt':
    process_my_cbt(data_dir, int_dir, inter, root_dir, user_data_rel_dir, input_network, input_track, track_label, user_network, sample_info)
  elif track_type=='cct' or track_type=='sst':
    process_my_cct_sst(data_dir, int_dir, inter, root_dir, user_data_rel_dir, input_network, input_track, track_label, user_network, sample_info)
  else:
    print "track type not supported"
    sys.exit(-1) 

def process_my_sbt(data_dir, int_dir, user_int_rel_dir, root_dir, user_data_rel_dir, input_network, input_track, user_network):
  # first get the ruler of the network.
  all_genes_file=open(os.path.join(data_dir,"tracks",input_network[0],"all_genes"))
  all_genes=all_genes_file.readline().split('\t')
  all_genes_file.close() 
  # there may be multiple input tracks to process 
  track_output_dir=os.path.join(root_dir, user_data_rel_dir,"tracks",input_network[0])
  track_output_rel_dir=os.path.join(user_data_rel_dir,"tracks",input_network[0])
  track_int_rel_dir=os.path.join(user_int_rel_dir,"tracks")
  if not os.path.exists(track_output_dir):
    os.makedirs(track_output_dir)
  for t in input_track:
    track_file_full=os.path.join(track_output_dir, os.path.splitext(t)[0])
    track_file_rel=os.path.join(track_output_rel_dir, os.path.splitext(t)[0])
    track_int_rel=os.path.join(track_int_rel_dir,t)
    all_ann_genes=[]
    t_file=open(os.path.join(int_dir, "tracks", t))
    # each user sbt track should contain 1 line or 2 lines (if the first starts with "All[Tab]All...."
    if not os.path.exists(track_file_full):
      track_file=open(track_file_full,"w")
      for line in t_file:
        items=line.rstrip().split("\t")
        if items[0]=="all" or items[0]=="All":
          all_ann_genes=items[2:]
          track_all=open(os.path.join(int_dir,"tracks",os.path.splitext(t)[0])+".all","w")
          track_all.write('\t'.join(all_ann_genes))
          track_all.close()
          continue
        else:
          length=len(items)-2
          label=re.sub(r'\s',"", items[0])
          tmp_string=""
          # this file is used during enrichment analysis, network specific
          track_related=open(os.path.join(track_output_dir, os.path.splitext(t)[0]+".related"),"w")
          for i in all_genes:
            if i in items:
              track_file.write('1\n')
              tmp_string=tmp_string+'1\t'
            else:
              if len(all_ann_genes)==0:
                track_file.write('0\n')
                tmp_string=tmp_string+'0\t'
              else:
                if i in all_ann_genes:
                  track_file.write('0\n')
                  tmp_string=tmp_string+'0\t'
                else:
                  track_file.write('NA\n')
                  tmp_string=tmp_string+'-1\t'
          track_related.write(tmp_string)
          track_related.close()
        track_file.close()
    else:  # the file already exists, get the label only
      for line in t_file:
        items=line.rstrip().split("\t")
        if items[0]=="all" or items[0]=="All":
          all_ann_genes=items[2:]
          continue
        else:
          length=len(items)-2
          label=re.sub(r'\s',"", items[0])
    print track_file_rel # url
    print track_int_rel
    print label # name 

def process_my_sct(data_dir, int_dir, user_int_rel_dir, root_dir, user_data_rel_dir, input_network, input_track, user_network):
  # first get the ruler of the network.
  all_genes_file=open(os.path.join(data_dir,"tracks",input_network[0],"all_genes"))
  all_genes=all_genes_file.readline().split('\t')
  all_genes_file.close() 
  # there may be multiple input tracks to process 
  track_output_dir=os.path.join(root_dir, user_data_rel_dir,"tracks",input_network[0])
  track_output_rel_dir=os.path.join(user_data_rel_dir,"tracks",input_network[0])
  track_int_rel_dir=os.path.join(user_int_rel_dir,"tracks")
  if not os.path.exists(track_output_dir):
    os.makedirs(track_output_dir)
  for t in input_track:
    t_file=open(os.path.join(int_dir, "tracks", t))
    header=t_file.readline().rstrip().split("\t")
    # it should be a single track, count=1
    count=len(header)-1
    # read the data to a dictionary
    dict={}
    for line in t_file:
      items=line.rstrip().split("\t")
      dict[items[0]]=items[1:]
    for i in range(count):
      headernospace=re.sub(r'\s',"", header[i+1])
      label=headernospace
      label=re.sub("[\"\']",'',label)  
      track_file_full=os.path.join(track_output_dir, os.path.splitext(t)[0])
      track_file_rel=os.path.join(track_output_rel_dir, os.path.splitext(t)[0])
      track_int_rel=os.path.join(track_int_rel_dir, t)
      if not os.path.exists(track_file_full):
        track_file=open(track_file_full,"w")
        for gene in all_genes:
          try:
            #x=str(round(float(dict[gene][i]),2))
            x="%.4g" %float(dict[gene][i])
          except ValueError:
            x='NA'  # missing value ( read 'NA')
          except KeyError:  # not found
            x='NA'
          except IndexError: # this probably will not happen
            x=0
          track_file.write(x+'\n')
        track_file.close()
      print track_file_rel
      print track_int_rel
      print header[1]

# input_track is a list of 1 element. 
def process_my_cbt(data_dir, int_dir, user_int_rel_dir, root_dir, user_data_rel_dir, input_network, input_track, track_label, user_network, sample_info):
  all_genes_file=open(os.path.join(data_dir,"tracks",input_network[0],"all_genes"))
  all_genes=all_genes_file.readline().split('\t')
  all_genes_file.close()
  input_trk=input_track[0]
  track_output_dir=os.path.join(root_dir, user_data_rel_dir,"tracks",input_network[0])
  track_output_rel_dir=os.path.join(user_data_rel_dir,"tracks",input_network[0])
  track_int_rel_dir=os.path.join(user_int_rel_dir,"tracks")
  if not os.path.exists(track_output_dir):
    os.makedirs(track_output_dir)
  t_file=open(os.path.join(int_dir, "tracks", input_trk))
  line=t_file.readline()
  line=line.rstrip()
  all_samples=line.split('\t')  
  # the first word is not a sample name
  all_samples.pop(0)
  samples=' '.join(all_samples)
  t_file.close()
  track_file_full=os.path.join(track_output_dir, os.path.splitext(input_trk)[0])
  track_file_rel=os.path.join(track_output_rel_dir, os.path.splitext(input_trk)[0])
  track_int_rel=os.path.join(track_int_rel_dir, input_trk)
  t_file=open(os.path.join(int_dir, "tracks", input_trk))
  header=t_file.readline().rstrip().split()
  if not os.path.exists(track_file_full):
    track_file=open(track_file_full,"w")
    # create a track data database file
    track_db_file=os.path.join(track_output_dir, os.path.splitext(input_trk)[0]+".db")
    if os.path.exists(track_db_file):
      os.remove(track_db_file)
    conn=sqlite3.connect(track_db_file)
    c=conn.cursor()
    # create table 
    command_str="create table track_data (gene_name text, gene_id int primary key,"
    i=1
    # assume sample name is a valid identifier for sql column
    for sample in all_samples:
      tmp_str="`"+sample+"` integer" # back tick prevent problem with column name having "-"
      command_str+=tmp_str
      if i!=len(all_samples):
        command_str+=","
      i=i+1
    command_str+=")"
    c.execute(command_str)
    command_str="create index track_data_gene_id on track_data (gene_id)";
    c.execute(command_str)
    dict={}
    for line in t_file:
      items=line.rstrip().split()
      dict[items[0]]=items[1:]
    i=1
    rand_str=id_generator()
    #tmpfile="/tmp/"+rand_str
    #tmpfile_handle=open(tmpfile,"w")
    #tmpfile_handle.write('\t'.join(map(str, header[1:])))
    #tmpfile_handle.write('\n')
    for gene in all_genes:
      try:
        data=dict[gene]
        # NA->NULL 
        data_str=','.join(map(db_int2str,data))
      except KeyError:
        data=['NA']*(len(items)-1)
        data_str=','.join(['NULL']*(len(items)-1))
    # Note: we may not need the data in trackFile anymore since we are using a database
    # tmpfile_handle.write('\t'.join(map(str, data)))
    # tmpfile_handle.write('\n')
      # insert row into database
      command_str="insert into track_data values ("
      command_str+=("'"+gene+"',")
      command_str+=(str(i)+",")
      command_str+=data_str 
      command_str+=")"
      c.execute(command_str)
      i=i+1
    # close database connection, files
    conn.commit()
    c.close()
    #tmpfile_handle.close()
    track_file.write("#GENECOUNT="+str(i-1)+"\n")
    track_file.write("#SUBTRACKCOUNT="+str(len(items)-1)+"\n")
    track_file.close()
    # reopen the file for appending
    #tmpfile_handle=open(tmpfile,"r")
    #track_file=open(track_file_full,"a")
    #track_file.write(tmpfile_handle.read())
    #track_file.close()
    #tmpfile_handle.close()
    #os.remove(tmpfile)
  print track_file_rel
  print track_int_rel
  print track_label
  print ' '.join(map(str, header[1:]))
  # processing sample information file if required
  if sample_info:
    trk_name_no_ext=os.path.splitext(input_trk)[0]
    mypath=os.path.join(int_dir,"tracks")
    process_sample_info(mypath, track_name_no_ext+".tsi",trk_name_no_ext, mypath)

def process_my_cct_sst(data_dir, int_dir, user_int_rel_dir, root_dir, user_data_rel_dir, input_network, input_track, track_label, user_network, sample_info):
  all_genes_file=open(os.path.join(data_dir,"tracks",input_network[0],"all_genes"))
  all_genes=all_genes_file.readline().split('\t')
  all_genes_file.close()
  input_trk=input_track[0]
  track_output_dir=os.path.join(root_dir, user_data_rel_dir,"tracks",input_network[0])
  track_output_rel_dir=os.path.join(user_data_rel_dir,"tracks",input_network[0])
  track_int_rel_dir=os.path.join(user_int_rel_dir,"tracks")
  if not os.path.exists(track_output_dir):
    os.makedirs(track_output_dir)
  t_file=open(os.path.join(int_dir, "tracks", input_trk))
  line=t_file.readline()
  line=line.rstrip()
  all_samples=line.split('\t')  
  # the first word is not a sample name
  all_samples.pop(0)
  samples=' '.join(all_samples)
  t_file.close()
  track_file_full=os.path.join(track_output_dir, os.path.splitext(input_trk)[0])
  track_file_rel=os.path.join(track_output_rel_dir, os.path.splitext(input_trk)[0])
  track_int_rel=os.path.join(track_int_rel_dir, input_trk)
  t_file=open(os.path.join(int_dir,"tracks", input_trk))  
  header=t_file.readline().rstrip().split()
  if not os.path.exists(track_file_full):
    track_file=open(track_file_full,"w") 
    # create a track data database file
    track_db_file=os.path.join(track_output_dir, os.path.splitext(input_trk)[0]+".db")
    if os.path.exists(track_db_file):
      os.remove(track_db_file)
    conn=sqlite3.connect(track_db_file)
    c=conn.cursor()
    # create table
    command_str="create table track_data (gene_name text, gene_id int primary key,"
    i=1
    # assume sample name is a valid identifier for sql column
    for sample in all_samples:
      tmp_str="`"+sample+"` real"
      command_str+=tmp_str
      if i!=len(all_samples):
        command_str+=","
      i=i+1
    command_str+=")"
    c.execute(command_str)
    command_str="create index track_data_gene_id on track_data (gene_id)";
    c.execute(command_str)
    dict={}
    for line in t_file:
      items=line.rstrip().split()
      # it is possible that some sample values may be missing
      dict[items[0]]=map(float_precision,items[1:])
    i=1
    # find out the max / min in data
    min=sys.float_info.max
    max=-1.0*sys.float_info.max
    rand_str=id_generator()
    #tmpfile="/tmp/"+rand_str
    #tmpfile_handle=open(tmpfile,"w")
    #tmpfile_handle.write('\t'.join(map(str, header[1:])))
    #tmpfile_handle.write('\n')
    # use for removing visual outlier
    all_data=[]
    for gene in all_genes:
      try:
        data=dict[gene]
        all_data.extend(data)
        # NA->NULL
        data_str=','.join(map(db_float2str,data))
        #(cur_min,cur_max)=get_min_max(data)
        #if cur_max>max:
        #  max=cur_max
        #elif cur_min<min:
        #  min=cur_min
      except KeyError: # missing values
        data=['NA']*(len(items)-1)
        data_str=','.join(['NULL']*(len(items)-1))
      #tmpfile_handle.write('\t'.join(map(str,data)))
      #tmpfile_handle.write('\n')
      # insert row into database
      command_str="insert into track_data values ("
      command_str+=("'"+gene+"',")
      command_str+=(str(i)+",")
      command_str+=data_str 
      command_str+=")"
      c.execute(command_str)
      i=i+1
    # close database connection, files
    conn.commit()
    c.close()
    #tmpfile_handle.close()
    # output the max, min to track file 
    # first remove outlier for better visualization
    (max, min)=get_max_min(all_data) 
    track_file.write("#MAX="+str(max)+"\n")
    track_file.write("#MIN="+str(min)+"\n")
    track_file.write("#GENECOUNT="+str(i-1)+"\n")
    # sample number
    track_file.write("#SUBTRACKCOUNT="+str(len(items)-1)+"\n")
    track_file.close()
    # reopen the file for appending
    #tmpfile_handle=open(tmpfile,"r")
    #track_file=open(track_file_full, 'a')
    #track_file.write(tmpfile_handle.read())
    #track_file.close()
    #tmpfile_handle.close()
    #os.remove(tmpfile)
  print track_file_rel
  print track_int_rel
  print track_label
  print ' '.join(map(str, header[1:]))
  # processing sample information file if required
  if sample_info:
    trk_name_no_ext=os.path.splitext(input_trk)[0]
    mypath=os.path.join(int_dir,"tracks")
    process_sample_info(mypath, trk_name_no_ext+".tsi", trk_name_no_ext, mypath)

# check format of view files if any
# return split files (to be deleted later)
# nsm required sections (in order): ruler, hmi, net
# msm required sections (in order): ruler, hmi, 
def preprocess_view_files(input_dir,file_list):
  global system_view_track_info
  global mapping_status
  nsm_files=[f for f in file_list if os.path.splitext(f)[1] in ['.nsm']]
  msm_files=[f for f in file_list if os.path.splitext(f)[1] in ['.msm']]
  # this is returned and the files in the list need to be deleted later
  split_files=[]
  # check required sections and split the file 
  for f in nsm_files:
    rul_exist=False
    hmi_exist=False
    net_exist=False
    pattern_rul=re.compile("^(#)+\s*ruler",re.IGNORECASE)
    pattern_hmi=re.compile("^(#)+\s*hmi",re.IGNORECASE)
    pattern_net=re.compile("^(#)+\s*net",re.IGNORECASE)
    fh=open(os.path.join(input_dir,f),"r")
    for line in fh:
      if pattern_rul.match(line):
        rul_exist=True
      elif pattern_hmi.match(line):
        hmi_exist=True
      elif pattern_net.match(line):
        net_exist=True
    if rul_exist and hmi_exist and net_exist:  #slpit the file
      fn=os.path.splitext(f)[0]
      fh.seek(0, 0)
      output_fh=[]
      rul_fn=os.path.join(input_dir,fn+".rul")
      rul_fh=open(rul_fn,"w")
      output_fh.append(rul_fh)
      split_files.append(rul_fn) 
      hmi_fn=os.path.join(input_dir,fn+".hmi")
      hmi_fh=open(hmi_fn,"w")
      output_fh.append(hmi_fh)
      split_files.append(hmi_fn) 
      net_fn=os.path.join(input_dir,fn+".net")
      net_fh=open(net_fn,"w")
      output_fh.append(net_fh)
      split_files.append(net_fn) 
      current_section=0
      section_header=re.compile("^(#)+")
      for line in fh:
        if section_header.match(line):
          current_section+=1
          continue
        output_fh[current_section-1].write(line)
      fh.close() 
      rul_fh.close()
      hmi_fh.close()
      net_fh.close()
      # find if the line is already in rul.cls
      rul_cls_fh=open(os.path.join(input_dir,"rul.cls"),"r")
      found_line=False
      rul_cls_pattern=re.compile("^"+fn+"\t")
      for line in rul_cls_fh:
        if rul_cls_pattern.match(line):
           found_line=True
           break
      rul_cls_fh.close()
      if not found_line:
        rul_cls_fh=open(os.path.join(input_dir,"rul.cls"),"a")
        rul_cls_fh.write(fn+"\tnetwork_view\n")
        rul_cls_fh.close()
    else:
      print "Warning: "+f+" does not have required section(s), skipping...."
  for f in msm_files:
    rul_exist=False
    hmi_exist=False
    net_exist=False
    cct_exist=False
    tsi_exist=False
    mapping_exist=False
    current_mapping_status=0  # should be 0, 1 or 2
    pattern_rul=re.compile("^(#)+\s*ruler",re.IGNORECASE)
    pattern_hmi=re.compile("^(#)+\s*hmi",re.IGNORECASE)
    pattern_net=re.compile("^(#)+\s*net",re.IGNORECASE)
    pattern_cct=re.compile("^(#)+\s*expression",re.IGNORECASE)
    pattern_tsi=re.compile("^(#)+\s*sample",re.IGNORECASE)
    pattern_mapping=re.compile("^(#)+\s*mapping",re.IGNORECASE)
    fh=open(os.path.join(input_dir,f),"r")
    for line in fh:
      if pattern_rul.match(line):
        rul_exist=True
      elif pattern_hmi.match(line):
        hmi_exist=True
      elif pattern_net.match(line):
        net_exist=True
      elif pattern_cct.match(line):
        cct_exist=True
      elif pattern_tsi.match(line):
        tsi_exist=True
      elif pattern_mapping.match(line):
        mapping_exist=True
    if rul_exist and hmi_exist and net_exist and cct_exist and tsi_exist:  #slpit the file, mapping status is optional for backward compatibility
      fn=os.path.splitext(f)[0]
      fh.seek(0, 0)
      output_fh=[]
      rul_fn=os.path.join(input_dir,fn+".rul")
      rul_fh=open(rul_fn,"w")
      output_fh.append(rul_fh)
      split_files.append(rul_fn) 
      hmi_fn=os.path.join(input_dir,fn+".hmi")
      hmi_fh=open(hmi_fn,"w")
      output_fh.append(hmi_fh)
      split_files.append(hmi_fn) 
      net_fn=os.path.join(input_dir,fn+".net")
      net_fh=open(net_fn,"w")
      output_fh.append(net_fh)
      split_files.append(net_fn) 
      cct_fn=os.path.join(input_dir, raw_track_data_dir, fn+".cct")
      cct_fh=open(cct_fn,"w")
      output_fh.append(cct_fh)
      split_files.append(cct_fn) 
      tsi_fn=os.path.join(input_dir, raw_track_data_dir, fn+".tsi")
      tsi_fh=open(tsi_fn,"w")
      output_fh.append(tsi_fh)
      split_files.append(tsi_fn) 
      current_section=0
      section_header=re.compile("^(#)+")
      for line in fh:
        if section_header.match(line):
        # for mapping status, don't create a file, just read the following line
          if pattern_mapping.match(line):
            mapping_status_line=next(fh)            
            current_mapping_status=int(mapping_status_line.split("=")[1])
            mapping_status[fn]=current_mapping_status
            if current_mapping_status!=0:
              system_view_track_info[fn]=fn
            continue
          else:
            current_section+=1
            if current_section==6:
              break
            else:
              continue
        output_fh[current_section-1].write(line)
      fh.close() 
      rul_fh.close()
      hmi_fh.close()
      net_fh.close()
      cct_fh.close()
      tsi_fh.close()
      # find if the line is already in rul.cls
      rul_cls_fh=open(os.path.join(input_dir,"rul.cls"),"r")
      found_line=False
      rul_cls_pattern=re.compile("^"+fn+"\t")
      for line in rul_cls_fh:
        if rul_cls_pattern.match(line):
           found_line=True
           break
      rul_cls_fh.close()
      if not found_line:
        rul_cls_fh=open(os.path.join(input_dir,"rul.cls"),"a")
        rul_cls_fh.write(fn+"\tnetwork_view\n")
        rul_cls_fh.close()
    else:
      print "Warning: "+f+" does not have required section(s), skipping...."
  return split_files  


# this function is called when generating tracks offline
def process_sys_sys(input_dir, int_dir, output_dir, tmpdir):
  if os.path.exists(output_dir): 
    shutil.rmtree(output_dir)
  os.mkdir(output_dir)
  #os.symlink(tmpdir, os.path.join(output_dir,"tiles"))
  if os.path.exists(int_dir): 
    shutil.rmtree(int_dir)
  os.mkdir(int_dir)
 # first process track detailed information and save it to a dictionary
 # original data in raw_data/tree/*.info
  global track_detail_info
  track_detail_info={}
  track_detail_info=process_track_detail_info(input_dir)
  #print track_detail_info
  file_list=[f for f in os.listdir(input_dir)]
  # view file type: nsm or msm
  split_files=preprocess_view_files(input_dir, file_list)
 # check file list again 
  file_list=[f for f in os.listdir(input_dir)]
  networks=[os.path.splitext(f)[0] for f in file_list if os.path.splitext(f)[1] in ['.rul']] 
  # separate sbt and sct into indivicual tracks and just copy cbt and cct
  # also create json file for each track 
  # these tracks will be used for the next step.
  # for each network, final tracks will be generated from these intermediate track (gene symbol based)
  # some of these tracks may be filtered out
  create_network_module_files(input_dir, networks)
  track_to_file=create_int_track_files(input_dir, os.path.join(int_dir,"tracks"))
  create_track_info(networks, input_dir, int_dir, output_dir, track_to_file)  
  print "\nCreating tree menu......"
  create_track_tree_menu(input_dir, output_dir)
  #print networks
  print "Done."
  for f in split_files:
    os.remove(f)
  sys.exit(0)

# create intermediate gene symbol based tracks and their information json files
def create_int_track_files(input_dir, int_dir):
  if usr_track==False and usr_network==False:
     print "Creating intermediate tracks ......"
  if os.path.exists(int_dir):
    shutil.rmtree(int_dir)
  os.mkdir(int_dir)
  # track id 0 is reserved for name track
  track_id=1
  raw_track_data=os.path.join(input_dir, raw_track_data_dir)
  file_list=[f for f in os.listdir(raw_track_data)] 
  # dictionary records track_id->source_file_name
  track_to_file={}
  # 5 types: sbt sct cbt cct sst
  for f in file_list:
    name, ext=os.path.splitext(f)
    if ext==".sbt": # sbt is a collection of sbt tracks, originally called *.bbt
      track_id=print_sbt_int_file(os.path.join(raw_track_data,f), int_dir, track_id, ext, track_to_file)
    elif ext==".sct": # sct is a collection of sct tracks, originally called *.bst
      track_id=print_sct_int_file(os.path.join(raw_track_data,f), int_dir, track_id, ext, track_to_file)
    elif ext==".cbt" or ext==".cct" or ext==".sst":
      track_id=print_composite_int_file(raw_track_data, f, int_dir, track_id, ext, track_to_file)
    else:
      continue 
  if usr_track==False and usr_network==False:
     print "Creating intermediate tracks ...... done"
  return track_to_file

def print_composite_int_file(raw_track_data, file, int_dir, start_id, ext, track_to_file):
  cur_id=start_id
  raw_file=os.path.join(raw_track_data, file)
  int_file=os.path.join(int_dir,str(start_id)+ext)
  shutil.copyfile(raw_file, int_file)
#if sample information file exists, process it now
  name_only=os.path.splitext(file)[0]
  sample_info_file=name_only+".tsi";
  sample_info_file_path=os.path.join(raw_track_data, sample_info_file);
  if os.path.isfile(sample_info_file_path):
    # copy to int dir, this is needed when user tries to download 
    shutil.copyfile(sample_info_file_path, os.path.join(int_dir, str(cur_id)+".tsi"))
    process_sample_info(raw_track_data, sample_info_file, cur_id, int_dir)
  track_to_file[cur_id]=os.path.basename(file)
  info_file=open(os.path.join(int_dir,str(cur_id)+'.json'),'w')
  print_track_info_json(info_file, os.path.splitext(os.path.basename(file))[0])
  info_file.close()
  cur_id+=1
  return cur_id

def print_sbt_int_file(sbt_file, int_dir, start_id, ext, track_to_file):
  file=open(sbt_file,"r")
  cur_id=start_id
  first_line=""
  sbt_name_only=os.path.splitext(os.path.basename(sbt_file))[0]
  matchObj=re.match('^ann_(.*)',sbt_name_only)
  category=''
  if matchObj:
    category=matchObj.group(1)
  for line in file:
    items=line.rstrip().split('\t')
    if items[0].upper()=="ALL":
      first_line=line
      continue
    int_file=open(os.path.join(int_dir,str(cur_id)+ext),'w')
    info_file=open(os.path.join(int_dir,str(cur_id)+'.json'),'w')
    if first_line!="":
      int_file.write(first_line.rstrip()) 
      int_file.write("\n")
    int_file.write(line.rstrip()) 
    label=re.sub(r'\s',"", items[0]);
    if len(category)!=0:
      label=category+label
    print_track_info_json(info_file, label)
    int_file.close()
    info_file.close()
    track_to_file[cur_id]=os.path.basename(sbt_file)
    cur_id+=1
  return cur_id

# return the next starting track id 
def print_sct_int_file(sct_file, int_dir, start_id, ext, track_to_file):
  f=open(sct_file,"r")
  # the first line is just title
  header_line=f.readline().rstrip()
  header=header_line.split("\t")
  count=len(header)-1 
  cur_id=start_id
  f.close()
  for i in range(count):
    f=open(sct_file,"r")
    header=f.readline().rstrip().split('\t')
    int_file=open(os.path.join(int_dir, str(cur_id)+ext),'w')
    int_file.write(header[0]+'\t'+header[i+1]+'\n')
    headernospace=re.sub(r'\s',"", header[i+1])
    label=re.sub("[\"\']",'',headernospace) 
    for line in f:
      items=line.rstrip().split("\t")
      try:
        x="%.4f" %float(items[i+1])
      except ValueError:
        x='NA'  # missing value ( read 'NA')
      except KeyError:  # not found
        x='NA'
      except IndexError: # this probably will not happen
        x=0
      int_file.write(items[0]+"\t"+x+"\n")
    int_file.close()
    info_file=open(os.path.join(int_dir,str(cur_id)+'.json'),'w')
    print_track_info_json(info_file,label)
    info_file.close()
    f.close()
    track_to_file[cur_id]=os.path.basename(sct_file)
    cur_id+=1
  return cur_id

def process_track_detail_info(input_dir):
  tree_dir=os.path.join(input_dir,"tree")
  mydict={}
  all_info_files=[f for f in os.listdir(tree_dir) if os.path.splitext(f)[1] in ['.info']]
  #print all_info_files
  for f in all_info_files:
    matchObj=re.match('^ann_(.*)',os.path.splitext(f)[0])
    category=''
    if matchObj:
      category=matchObj.group(1)
    f_handle=open(os.path.join(tree_dir,f),"r")
    keys=f_handle.readline().rstrip().split("\t")
    del keys[0]
    for line in f_handle:
      lst=line.rstrip().split("\t")
      # remove special characters from label
      lst[0]=re.sub(r'\s',"", lst[0])
      lst[0]=re.sub("[\"\']",'',lst[0])
      if category:
        label=category+lst[0]
      else:
			  label=lst[0]
      del lst[0]
      value={}
      index=0
      for key in keys:
        value[key]=lst[index]
        index=index+1
      mydict[label]=value
    f_handle.close()
  return mydict

def float_precision(s):
  try:
    float(s) 
    return round(float(s),2)
  except ValueError: # "NA" (string that does not represent a number)
    return s

def db_float2str(s):
  try:
    float(s) 
    return str(s)
  except ValueError: # "NA" (string that does not represent a number)
    return 'NULL'

def db_int2str(s):
  try:
    int(s) 
    return str(s)
  except ValueError: # "NA" (string that does not represent a number)
    return 'NULL'

# s is a list of float with possible 'NA's
#def get_min_max(s):
#  min=sys.float_info.max
#  max=-1.0*sys.float_info.max
#  for d in s:
#    try:
#      tmp=float(d)
#      if tmp>max:
#        max=tmp
#      elif tmp<min:
#        min=tmp
#    except ValueError:
#       continue
#  return (min,max)


def percentile(N, percent, key=lambda x:x):
  """
  Find the percentile of a list of values.

  @parameter N - is a list of values. Note N MUST BE already sorted.
  @parameter percent - a float value from 0.0 to 1.0.
  @parameter key - optional key function to compute value from each element of N.

  @return - the percentile of the values
  """
  if not N:
    return None
  k = (len(N)-1) * percent
  f = math.floor(k)
  c = math.ceil(k)
  if f == c:
    return key(N[int(k)])
  d0 = key(N[int(f)]) * (c-k)
  d1 = key(N[int(c)]) * (k-f)
  return d0+d1

# s is a list of float with possible 'NA's

def get_percentiles(s):
  global percentiles
  percentile_values=[]
  return percentile_values

# s is a list of float with possible 'NA's
def get_max_min(s):
  data=[]  # remove 'NA', for now assume no INFINITY 
  for d in s:
    try: 
      tmp=float(d)
      data.append(tmp)
    except ValueError:
      continue
  data.sort()
  
  max=data[-1]
  min=data[0]
  return (max, min)

#
def rescaleMaxMin(max, min):
  abs_max=math.fabs(max)
  abs_min=math.fabs(min)

  if abs_max>abs_min:
    r=abs_max
  elif abs_max<abs_min:
    r=abs_min
  else:
    r=abs_max
  return (r,-1.0*r)

# create tree structure json file
def create_track_tree_menu(input_dir, output_dir):
  tree_input_path=os.path.join(input_dir,"tree")
  tree_output_path=os.path.join(output_dir,"tree")
  if os.path.exists(tree_output_path):
    shutil.rmtree(tree_output_path)   
  os.mkdir(tree_output_path)
  tree_input=os.path.join(tree_input_path, "NetgestaltTrack.txt")
  tree_output=os.path.join(tree_output_path, "netgestaltTrack.json")
  leafNodeTrack=os.path.join(tree_input_path, "leafNodeTrack.txt")
  leafNodes=os.path.join(tree_output_path, "leafNodes.json")
  treeID2originalID=os.path.join(tree_output_path,"treeID2originalID.json")
  input_f=open(tree_input,"r")
  output_f=open(tree_output,"w")
  leafNodes_f=open(leafNodes,"w")
  leafNodeTrack_f=open(leafNodeTrack,"r")
  treeID2originalID_f=open(treeID2originalID,"w")
  #skip the first input line
  input_f.readline()
  tree={}
  for line in input_f:
    lst=line.rstrip().split("\t")
    nodeId, parentId, caption=lst[0], lst[1], lst[2]
    # remove " from caption
    caption=re.sub("[\"]",'',caption)
    if parentId not in tree:
      # initialize an empty list
      tree[parentId]={}
    tree[parentId][nodeId]=caption
  #print tree
  treeID2originalID_f.write("{")
  output_f.write("{id:0,")
  print_children('-1', tree, 0, output_f, treeID2originalID_f)
  output_f.write("\n}")
  output_f.close()
  input_f.close()
  #skip the first line
  leafNodeTrack_f.readline()
  leafNodes_f.write("{\n")
  prevNode="-1"
  for line in leafNodeTrack_f:
    lst=line.rstrip().split("\t")
    currentNode, caption=lst[0],lst[1] 
    caption=re.sub("[\"]",'',caption)
    if currentNode==prevNode:
      leafNodes_f.write(",\""+caption+"\"") 
    else:
      if prevNode=="-1":
        leafNodes_f.write("\""+currentNode+"\":[\""+caption+"\"")
      else:
        leafNodes_f.write("],\n\""+currentNode+"\":[\""+caption+"\"")
    prevNode=currentNode  
  leafNodes_f.write("]\n}")
  treeID2originalID_f.write("}")
  leafNodeTrack_f.close()
  leafNodes_f.close()
  treeID2originalID_f.close()

# print the tree recursively
def print_children(parentId, tree, startId, output_f, treeID2originalID_f):
  if parentId in tree: 
    output_f.write("\nitem:[\n")
    #for item in tree[parentId]:
    for item in sorted(tree[parentId],key=tree[parentId].__getitem__):
      newid=parentId+"_"+str(startId+1)
      output_f.write("{id:\""+newid+"\",text:\""+tree[parentId][item]+"\"")
      treeID2originalID_f.write("\""+newid+"\":\""+item+"\",")
      if item in tree:
        output_f.write(",child:"+str(len(tree[item]))+",")
  #     print item
        print_children(item, tree, 0, output_f, treeID2originalID_f)
      output_f.write("}")
      startId=startId+1
      if startId!=len(tree[parentId]):
        output_f.write(",")
    output_f.write("]")
  else:
    return

def create_track_info(networks, input_dir, int_dir, output_dir, track_to_file):
  global usr_track, usr_network
  if (not usr_track) and (not usr_network):
    network_info=os.path.join(output_dir,"networkInfo.js")
    network_info_file=open(network_info,"w")
    print "Creating networkInfo.js......"
    create_network_info_file(input_dir, networks, network_info_file, "system")
    network_info_file.close()
    print "Creating all tracks......"
    create_all_tracks(input_dir, int_dir, output_dir, networks, track_to_file)
  else:
    pass

def create_all_tracks(input_dir, int_dir, output_dir, networks,  track_to_file):
  global label2ngid_file
  global usr_track
  global ann_done
  track_path=os.path.join(output_dir,"tracks")
  int_track_path=os.path.join(int_dir,"tracks")
  module_path=os.path.join(output_dir,"modules")
  network_path=os.path.join(output_dir,"networks")
  info_path=os.path.join(output_dir,"info")
  if os.path.exists(track_path):
    shutil.rmtree(track_path)
  if os.path.exists(module_path):
    shutil.rmtree(module_path)
  if os.path.exists(network_path):
    shutil.rmtree(network_path)
  if os.path.exists(info_path):
    shutil.rmtree(info_path)
  os.mkdir(track_path)
  os.mkdir(module_path)
  os.mkdir(network_path)
  os.mkdir(info_path)
  # create module info file
  for n in networks:
    # create a ann_NETWORKNAME_module.sbt for NETWORKNAME.hmi file in raw_track_data directory and later delete it.
    if usr_track==False and usr_network==False:
      print "\nNetwork: "+n+"......"
    track_outdir=os.path.join(track_path, n)
    module_dir=os.path.join(os.path.join(module_path, n))
    os.mkdir(module_dir)
    os.mkdir(track_outdir)
    if usr_track==False and usr_network==False:
      print "  Creating module file......"
      create_module_file(os.path.join(module_dir,"modules"), input_dir, n)
    network_dir=os.path.join(os.path.join(network_path, n))
    os.mkdir(network_dir)
    if usr_track==False and usr_network==False:
      print "  Creating network file......"
      create_net_file(input_dir, n, network_dir)
    # prepare track_info_file for the current network
    info_dir=os.path.join(os.path.join(info_path, n))
    os.mkdir(info_dir)
    if usr_track==True:
      track_info_file=sys.stdout
    else:
      track_info_file=open(os.path.join(info_dir,"trackInfo.js"),"w")
    track_info_file.write("[\n")
    label2ngid_file=open(os.path.join(track_outdir,"label2ngid.json"),"w")
    label2ngid_file.write("{")
    sbt_category_file=open(os.path.join(track_outdir,"sbt_categories"),"w")
    cur_track_id=0 # reset the id for current network
    all_genes=[]
    # read all the genes from current ruler file 
    ruler_f=open(os.path.join(input_dir,n+".rul"),"r")
    # skip the first line
    ruler_f.readline()
    for line in ruler_f:
      all_genes.append(line.rstrip().split("\t")[4])
    ruler_f.close()
    raw_track_data=os.path.join(input_dir, raw_track_data_dir)
    if usr_track==False:
      print_ruler_track(track_info_file, all_genes, n, track_path)
    all_categories=set()
    file_list=[f for f in os.listdir(int_track_path)] 
    file_count=len(file_list)
    progress_bar_width=100
    progress_bar_step_width=100/progress_bar_width
    cur_file_count=0
    # 5 types: sbt sct cbt cct sst
    if usr_track==False and usr_network==False:
      print "  Creating track files......"
    # if network is msm generated and its mapping status is not 0, only 1 track needs to be generated
    if n in system_view_track_info:
      old_file_list=file_list[:]
      file_list=[]
      for f in old_file_list:
        name,ext=os.path.splitext(f)
        try:
          int_name=int(name)  
          if track_to_file[int(name)].split(".")[0]!=n:
            continue
          else:
            file_list.append(f)
        except ValueError:
          continue
    for f in file_list:
      if usr_track==False and usr_network==False:
        cur_file_count+=1
        progress=int(1.0*cur_file_count/file_count*100)
        if progress%progress_bar_step_width==0:
          update_progress(progress, progress_bar_width)
        if cur_file_count==len(file_list):
          update_progress(100, progress_bar_width)
      name, ext=os.path.splitext(f)
      if ext==".sbt": # sbt is a collection of sbt tracks, originally called *.bbt
        try:
          process_sbt(track_info_file, all_genes, f, n, track_path, int_track_path, track_to_file, all_categories)
        #except (KeyboardInterrupt, SystemExit):
        #  raise
        except:
          if usr_track==False and usr_network==False:
            print " Error processing "+f+" ......" 
          raise
      elif ext==".sct": # sct is a collection of sct tracks, originally called *.bst
        try:
          process_sct(track_info_file, all_genes, f, n, track_path, int_track_path, track_to_file)
        except:
          if usr_track==False and usr_network==False:
            print " Error processing "+f+" ......" 
          raise
      elif ext==".cbt":
        try:
          process_cbt(track_info_file, all_genes, f, n, track_path, int_track_path, track_to_file)
        except:
          if usr_track==False and usr_network==False:
            print " Error processing "+f+" ......" 
          raise
      elif ext==".cct" or ext==".sst":
        actual_track_file_name=track_to_file[int(name)].split(".")[0]
        if actual_track_file_name in system_view_track_info and n!=actual_track_file_name:
          continue
        try:
          process_cct_sst(track_info_file, all_genes, f, ext, n, track_path, int_track_path, track_to_file)
        except:
          if usr_track==False and usr_network==False:
            print " Error processing "+f+" ......" 
          raise
      else:
        continue
    if len(all_categories)!=0:
      for i in sorted(all_categories):
        sbt_category_file.write(i+'\n')
    label2ngid_file.seek(-1, os.SEEK_CUR)
    label2ngid_file.write("}")
    label2ngid_file.close()
    sbt_category_file.close()
    if usr_track==False:
      track_info_file.seek(-2,2)
    track_info_file.write("]")
    track_info_file.close()
    if ann_done==False:
      ann_done=True  # ann category done for once
    # sort the sbt_categories file so that the categories will be listed alphabetically
    #sort_file(os.path.join(track_outdir,"sbt_categories"))
    remove_network_module_file(input_dir, n) 
 
def create_network_module_files(input_dir, networks):
  for network in networks:
    all_genes=[]
    # read all the genes from current ruler file 
    ruler_f=open(os.path.join(input_dir,network+".rul"),"r")
    # skip the first line
    ruler_f.readline()
    for line in ruler_f:
      all_genes.append(line.rstrip().split("\t")[4])
    ruler_f.close()
    output_name="ann_"+network+"_module.sbt"
    mf=open(os.path.join(input_dir, raw_track_data_dir, output_name),"w")
    hmi_input=open(os.path.join(input_dir, network)+".hmi","r")
    # skip the first line
    hmi_input.readline()
    for line in hmi_input:
      items=line.rstrip().split("\t")
      tmp_string=""
      end=int(items[5])
      start=int(items[4])
      level=items[1]
      module_order=items[2]
      yes_or_no=items[0]
      for i in range(end-start+1):
        tmp_string=tmp_string+all_genes[i-1+start]
        if i!=end-start:
          tmp_string=tmp_string+"\t" 
      mf.write("Level"+level+"_Module"+module_order+"_"+yes_or_no+"\tNULL\t"+tmp_string+"\n")
    mf.close()
    hmi_input.close()

def remove_network_module_file(input_dir, network):
  os.remove(os.path.join(input_dir, raw_track_data_dir,"ann_"+network+"_module.sbt"))

def create_module_file(module_file, input_dir, network):
  mf=open(module_file,"w")
  module_input=open(os.path.join(input_dir,network)+".hmi","r")
  reader = csv.DictReader(module_input, fieldnames = module_input.readline().rstrip().split("\t"), dialect="excel-tab")
  mf.write(json.dumps( [ row for row in reader ] ) ) 
  mf.close()

# convert edge list to json format
def create_net_file(input_dir, network, output_dir):
  netfile=os.path.join(input_dir,network)+".net"
  network_dest_file=os.path.join(output_dir, "network")
#  os.system("cp "+netfile+" "+network_dest_file)
  netfile_f=open(netfile,"r")
  network_f=open(network_dest_file,"w")
  network_d={} 
  for line in netfile_f:
    nodes=line.split()
    if not (nodes[0] in network_d):
      network_d[nodes[0]]={nodes[1]:1}
    else:
      if not (nodes[1] in network_d[nodes[0]]):
        network_d[nodes[0]][nodes[1]]=1 # for now the value "1" is not important
    if not (nodes[1] in network_d):
      network_d[nodes[1]]={nodes[0]:1}
    else:
      if not (nodes[0] in network_d[nodes[1]]):
        network_d[nodes[1]][nodes[0]]=1 
  s=json.dumps(network_d)
  network_f.write(s)
  netfile_f.close()
  network_f.close()

def print_ruler_track(track_info_file, all_genes, network, track_path):
  if track_info_file:
    print_track_info(track_info_file, 0, network, 'name', 'NameTrack', 'NameTrack', '', 'Name', 'Null', 'Topology')
  track_outdir=os.path.join(track_path, network)
  trackFile=open(os.path.join(track_outdir, "0"), 'w')
  all_genes_file=open(os.path.join(track_outdir, "all_genes"),'w')
  print_track_file_header(trackFile, 0, network, 'name', 'NameTrack', 'NameTrack', '', 'Name', 'Null', 'Topology')
  for i in range(len(all_genes)):
    trackFile.write(all_genes[i]+','+str(i+1))
    trackFile.write('\n')
    all_genes_file.write(all_genes[i])
    if i!=len(all_genes)-1:
      all_genes_file.write('\t')
  trackFile.close()
  all_genes_file.close()

# Composite Binary Track
def process_cbt(track_info_file, all_genes, cbt, network, track_path, int_track_path, track_to_file):
  # sample
  raw_file=os.path.join(int_track_path, cbt)
  raw_file_handle=open(raw_file,"r")
  track_id=int(os.path.splitext(cbt)[0])
  cbt_name=os.path.splitext(track_to_file[track_id])[0]
  line=raw_file_handle.readline()
  line=line.rstrip()
  all_samples=line.split('\t')  
  # the first word is not a sample name
  all_samples.pop(0)
  samples=' '.join(all_samples)
  raw_file_handle.close()
  print_track_info(track_info_file, track_id, network, cbt_name, 'CompositeTrack', 'cbt', samples, cbt_name, 'Null', 'Composite Binary Tracks')
  track_outdir=os.path.join(track_path, network)
  trackFile=open(os.path.join(track_outdir, str(track_id)), 'w')
  # create a track data database file
  track_db_file=os.path.join(track_outdir, str(track_id)+".db")
  conn=sqlite3.connect(track_db_file)
  c=conn.cursor()
  # create table 
  command_str="create table track_data (gene_name text, gene_id int primary key,"
  i=1
  # assume sample name is a valid identifier for sql column
  for sample in all_samples:
    tmp_str="`"+sample+"` integer" # back tick prevent problem with column name having "-"
    command_str+=tmp_str
    if i!=len(all_samples):
      command_str+=","
    i=i+1
  command_str+=")"
  c.execute(command_str)
  command_str="create index track_data_gene_id on track_data (gene_id)";
  c.execute(command_str)
  print_track_file_header(trackFile, track_id,  network, cbt_name, 'CompositeTrack', 'cbt', samples, cbt_name, 'Null', 'Composite Binary Tracks')
  file=open(os.path.join(int_track_path,cbt),"r")  
  header=file.readline().rstrip().split()
  dict={}
  for line in file:
    items=line.rstrip().split()
    dict[items[0]]=items[1:]
  i=1
  rand_str=id_generator()
  #tmpfile="/tmp/"+rand_str
  #tmpfile_handle=open(tmpfile,"w")
  #tmpfile_handle.write('\t'.join(map(str, header[1:])))
  #tmpfile_handle.write('\n')
  for gene in all_genes:
    try:
      data=dict[gene]
      # NA->NULL 
      data_str=','.join(map(db_int2str,data))
    except KeyError:
      data=['NA']*(len(items)-1)
      data_str=','.join(['NULL']*(len(items)-1))
  # Note: we may not need the data in trackFile anymore since we are using a database
    #tmpfile_handle.write('\t'.join(map(str, data)))
    #tmpfile_handle.write('\n')
    # insert row into database
    command_str="insert into track_data values ("
    command_str+=("'"+gene+"',")
    command_str+=(str(i)+",")
    command_str+=data_str 
    command_str+=")"
    c.execute(command_str)
    i=i+1
  # close database connection, files
  conn.commit()
  c.close()
  #tmpfile_handle.close()
  trackFile.write("#GENECOUNT="+str(i-1)+"\n")
  trackFile.write("#SUBTRACKCOUNT="+str(len(items)-1)+"\n")
  trackFile.close()
  # reopen the file for appending
  #tmpfile_handle=open(tmpfile,"r")
  #trackFile=open(os.path.join(track_outdir, str(track_id)), 'a')
  #trackFile.write(tmpfile_handle.read())
  #trackFile.close()
  #tmpfile_handle.close()
  #os.remove(tmpfile)


# Composite Continuous Track or Summary Snapshot Track
def process_cct_sst(track_info_file, all_genes, cct_sst, ext, network, track_path, int_track_path, track_to_file):
  # sample
  raw_file=os.path.join(int_track_path, cct_sst)
  raw_file_handle=open(raw_file,"r")
  track_id=int(os.path.splitext(cct_sst)[0])
  cct_sst_name=os.path.splitext(track_to_file[track_id])[0]
  line=raw_file_handle.readline()
  line=line.rstrip()
  all_samples=line.split('\t')  
  # the first word is not a sample name
  all_samples.pop(0)
  samples=' '.join(all_samples)
  raw_file_handle.close()
  if ext==".cct":
    print_track_info(track_info_file, track_id, network, cct_sst_name, 'CompositeTrack', 'cct', samples, cct_sst_name, 'Null', 'Composite Continuous Tracks')
  elif ext==".sst":
    print_track_info(track_info_file, track_id, network, cct_sst_name, 'CompositeTrack', 'sst', samples, cct_sst_name, 'Null', 'Summary Snapshot Tracks')
  track_outdir=os.path.join(track_path, network)
  trackFile=open(os.path.join(track_outdir, str(track_id)), 'w')
  # create a track data database file
  track_db_file=os.path.join(track_outdir, str(track_id)+".db")
  conn=sqlite3.connect(track_db_file)
  c=conn.cursor()
  # create table
  command_str="create table track_data (gene_name text, gene_id int primary key,"
  i=1
  # assume sample name is a valid identifier for sql column
  for sample in all_samples:
    tmp_str="`"+sample+"` real"
    command_str+=tmp_str
    if i!=len(all_samples):
      command_str+=","
    i=i+1
  command_str+=")"
  c.execute(command_str)
  command_str="create index track_data_gene_id on track_data (gene_id)";
  c.execute(command_str)
  if ext==".cct":
    print_track_file_header(trackFile, track_id, network, cct_sst_name, 'CompositeTrack', 'cct', samples, cct_sst_name, 'Null', 'Composite Continuous Tracks')
  elif ext==".sst":
    print_track_file_header(trackFile, track_id, network, cct_sst_name, 'CompositeTrack', 'sst', samples, cct_sst_name, 'Null', 'Summary Snapshot Tracks')
  file=open(os.path.join(int_track_path,cct_sst),"r")  
  header=file.readline().rstrip().split()
  dict={}
  for line in file:
    items=line.rstrip().split()
    # it is possible that some sample values may be missing
    dict[items[0]]=map(float_precision,items[1:])
  i=1
  # find out the max / min in data
  min=sys.float_info.max
  max=-1.0*sys.float_info.max
  rand_str=id_generator()
  #tmpfile="/tmp/"+rand_str
  #tmpfile_handle=open(tmpfile,"w")
  #tmpfile_handle.write('\t'.join(map(str, header[1:])))
  #tmpfile_handle.write('\n')
  # use for removing visual outlier
  all_data=[]
  for gene in all_genes:
    try:
      data=dict[gene]
      all_data.extend(data)
      # NA->NULL
      data_str=','.join(map(db_float2str,data))
      #(cur_min,cur_max)=get_min_max(data)
      #if cur_max>max:
      #  max=cur_max
      #elif cur_min<min:
      #  min=cur_min
    except KeyError: # missing values
      data=['NA']*(len(items)-1)
      data_str=','.join(['NULL']*(len(items)-1))
    # TODO: we may not need the data in trackFile anymore since we are using a database
    #tmpfile_handle.write('\t'.join(map(str,data)))
    #tmpfile_handle.write('\n')
    # insert row into database
    command_str="insert into track_data values ("
    command_str+=("'"+gene+"',")
    command_str+=(str(i)+",")
    command_str+=data_str 
    command_str+=")"
    c.execute(command_str)
    i=i+1
  # close database connection, files
  conn.commit()
  c.close()
  #tmpfile_handle.close()
  # output the max, min to track file 
  # first remove outlier for better visualization
  (max, min)=get_max_min(all_data) 
  trackFile.write("#MAX="+str(max)+"\n")
  trackFile.write("#MIN="+str(min)+"\n")
  trackFile.write("#GENECOUNT="+str(i-1)+"\n")
  # sample number
  trackFile.write("#SUBTRACKCOUNT="+str(len(items)-1)+"\n")
  trackFile.close()
  # reopen the file for appendin, cct actual data are in database now
  #tmpfile_handle=open(tmpfile,"r")
  #trackFile=open(os.path.join(track_outdir, str(track_id)), 'a')
  #trackFile.write(tmpfile_handle.read())
  #trackFile.close()
  #tmpfile_handle.close()
  #os.remove(tmpfile)
 
# Batch of Simple Binary Tracks
def process_sbt(track_info_file, all_genes, f, network, track_path, int_track_path, track_to_file, all_categories):
  global sbt_category_file
  global ann_done
  file=open(os.path.join(int_track_path,f),"r")
  track_id=int(os.path.splitext(f)[0])
  sbt_src_name=os.path.splitext(track_to_file[track_id])[0]
  track_outdir=os.path.join(track_path, network)
  track_intdir=int_track_path
  matchObj=re.match('^ann_(.*)', sbt_src_name)
  networkNameObj=re.match('^ann_(.*)_module',sbt_src_name)
  category=''
  networkName=''
  if matchObj:
    category=matchObj.group(1)
  if networkNameObj:
    networkName=networkNameObj.group(1)
  if not ann_done:
    # for annotated sbt, original name with format ann_XXXX.sbt)
    # create a separate track file for each .sbt 
    if len(category)!=0:
      category_file_name=os.path.join(track_intdir,category)
      if os.path.exists(category_file_name):
        category_file=open(category_file_name, 'a')
      else:
        category_file=open(category_file_name, 'w')
  if len(category)!=0:
    category_file_related_name=os.path.join(track_outdir,category+".related")
    if os.path.exists(category_file_related_name):
      category_related_file=open(category_file_related_name, 'a')
    else:
      category_related_file=open(category_file_related_name, 'w')
  total_length=len(all_genes)
  # to see if the first line has format of "All All XX  XX...."
  all_ann_genes=[]
  # now each file contains at most 2 lines
  for line in file: #each line is tab dilimited 
    items=line.rstrip().split('\t')
    mykey=items[0]
    if items[0]=="all" or items[0]=="All":
      all_ann_genes=items[2:]
      if not ann_done:
        if len(category)!=0:
          category_all_genes_file=open(os.path.join(track_outdir, category+'.all'),'w')
          category_all_genes_file.write('\t'.join(all_ann_genes))
          category_all_genes_file.close()
        else:
          category_all_genes_file=open(os.path.join(track_outdir, os.path.splitext(f)[0]+'.all'),'w')
          category_all_genes_file.write('\t'.join(all_ann_genes))
          category_all_genes_file.close()
      continue
    length=len(items)-2
    # filter for go_XX only
    matchCategory=re.match('^go_',category)
    #if matchCategory!=None and (length<int(total_length*lower_limit/100) or length>int(total_length*upper_limit/100)) :
    if matchCategory!=None and ((length<lower_limit) or (length>upper_limit)) :
      continue
    label=re.sub(r'\s',"", items[0]);
    if len(networkName)!=0:
      mykey=networkName+"_"+mykey
    if len(category)!=0:
      label=category+label
    print_track_info(track_info_file, track_id, network, label, 'SimpleTrack', 'sbt', '', mykey, items[1], sbt_src_name)
    trackFile=open(os.path.join(track_outdir,str(track_id)),'w')
    trackFileRelated=open(os.path.join(track_outdir,str(track_id)+".related"),'w')
    print_track_file_header(trackFile, track_id, network, label, 'SimpleTrack', 'sbt', '', mykey, items[1], sbt_src_name) 
    # remove " or '
    label=re.sub("[\"\']",'',label)  
    tempString=label+'\t'+'\t'.join(items[2:])+'\n'
    tempString2=''
    for i in all_genes:
      if i in items:
        trackFile.write('1\n')
        tempString2=tempString2+"1\t"
      else:
        if len(all_ann_genes)==0:
          trackFile.write('0\n')
          tempString2=tempString2+"0\t"
        else: 
          if i in all_ann_genes:
            trackFile.write('0\n')
            tempString2=tempString2+"0\t"
          else:
            trackFile.write('NA\n')
            tempString2=tempString2+"-1\t"
    trackFileRelated.write(tempString2)
    trackFileRelated.close()
    tempString2=label+'\t'+'\t'+tempString2+'\n'
    if not ann_done:
      if len(category)!=0:
        category_file.write(tempString)
    if len(category)!=0:
      category_related_file.write(tempString2)
    trackFile.close()
  if len(category)!=0:
    all_categories.add(category)
    if not ann_done:
      category_file.close()
    category_related_file.close()

# Simple Continuous Track
# each file contains one SCT
def process_sct(track_info_file, all_genes, f, network, track_path, int_track_path, track_to_file):
  file=open(os.path.join(int_track_path, f),"r")
  track_id=int(os.path.splitext(f)[0])
  sct_src_name=os.path.splitext(track_to_file[track_id])[0]
  header=file.readline().rstrip().split("\t")
  # we have this many new tracks, now it is single track
  count=len(header)-1
  # read the data to a dictionary
  dict={}
  for line in file:
    items=line.rstrip().split("\t")
    dict[items[0]]=items[1:]
  for i in range(count):
    headernospace=re.sub(r'\s',"", header[i+1])
    #label=bst_name+headernospace
    label=headernospace
    label=re.sub("[\"\']",'',label)  
    type='SimpleTrack'
    #key=bst_name+' '+header[i+1]
    key=header[i+1]
    link='Null'
    category=sct_src_name
    print_track_info(track_info_file, track_id, network, label, type, 'sct', '',  key, link, category)
    track_outdir=os.path.join(track_path, network)
    track_intdir=int_track_path
    trackFile=open(os.path.join(track_outdir,str(track_id)),'w')
    print_track_file_header(trackFile, track_id,  network, label, type, 'sct', '', key, link, category)
    for gene in all_genes:
      try:
        #x=str(round(float(dict[gene][i]),2))
        x="%.4f" %float(dict[gene][i])
      except ValueError:
        x='NA'  # missing value ( read 'NA')
      except KeyError:  # not found
        x='NA'
      except IndexError: # this probably will not happen
        x=0
      trackFile.write(x+'\n')
    trackFile.close()

# this function create multiple files for each *.tsi file.
# the first file TRACK_ID.all_features contains mapping of all features to feature ID.
# the seconde file TRACK_ID_sample.db is a database for all the features ( for easy sorting purpose)
def process_sample_info(raw_track_data, sample_info_file, cur_track_id, track_path):
  global tracks_with_sample_info_file
  tracks_with_sample_info_file.append(cur_track_id)
  sample_file=os.path.join(raw_track_data, sample_info_file)
  sample_file_handle=open(sample_file,"r");
  # first 2 lines contain feature names and data type;
  # (optional) 3rd line contains feature category information
  line=sample_file_handle.readline().rstrip()
  all_features=line.split('\t')
  all_features.pop(0) # delete the first item
  line=sample_file_handle.readline().rstrip()
  all_data_types=line.split('\t')
  all_data_types.pop(0)
  all_data_types_new=[]
  all_features_new=[]
  all_feature_categories_new=[]
  feature_category_exists=False
  # check if there is a line starting with the keyword "category"
  line=sample_file_handle.readline().rstrip()
  all_feature_categories=line.split('\t')
  matchObj = re.match('category', all_feature_categories[0], re.I)
  if matchObj:
    feature_category_exists=True
    all_feature_categories.pop(0) 
    all_feature_categories_uniq=remove_duplicates(all_feature_categories)
  # deal with "SUR" (survival) data type.  
  # each SUR data type is represented by 3 columns in the database, one for the original ('text' type in the database),
  #the other two for the time and event after the split for original text (both are 'real' type in the database)
  for i,item in enumerate(all_data_types):
    if item=="SUR":   
      all_data_types_new.append(item)
      all_features_new.append(all_features[i])
      all_data_types_new.append("CON")  # for survival time
      all_features_new.append(all_features[i]+"_Time")
      all_data_types_new.append("CON")  # for survival event 
      all_features_new.append(all_features[i]+"_Event")
      if feature_category_exists:
        all_feature_categories_new.append(all_feature_categories[i])
        all_feature_categories_new.append(all_feature_categories[i])
        all_feature_categories_new.append(all_feature_categories[i])
    else:  
      all_data_types_new.append(item) 
      all_features_new.append(all_features[i])
      if feature_category_exists:
        all_feature_categories_new.append(all_feature_categories[i])
  # create a dictionary 
  all_features_dict={}
  all_features_val={}
  track_outdir=track_path
  all_features_out_file=os.path.join(track_outdir, str(cur_track_id)+".all_features")
  all_features_out_handle=open(all_features_out_file,"w")
  for i,item in enumerate(all_features_new):
    if feature_category_exists:
      all_features_val[item]={"type":all_data_types_new[i],"id":i,"category":all_feature_categories_new[i]}
    else:
      all_features_val[item]={"type":all_data_types_new[i],"id":i}
  all_features_dict["features"]=all_features_val
  if feature_category_exists:
    all_features_dict["feature_categories"]=all_feature_categories_uniq
  all_features_out_handle.write(json.dumps(all_features_dict))
  all_features_out_handle.close()
  sample_file_handle.seek(0)
  # create a sqlite database for all the sample features
  all_features_db_file=os.path.join(track_outdir, str(cur_track_id)+"_sample.db")
  conn=sqlite3.connect(all_features_db_file)
  c=conn.cursor()     
  # prepare all the header
  line=sample_file_handle.readline().rstrip()
  #all_features=line.split('\t')
  all_features_new.insert(0, "Barcode")
  all_features=all_features_new
  for i,item in enumerate(all_features):
    all_features[i]=item.replace(' ','_')
  line=sample_file_handle.readline().rstrip()
  #original_types=line.split('\t')
  all_types=[]
  all_types.append('text unique') # barcode is text type
  for item in all_data_types_new:
    if item=='CON':
      all_types.append('real')
    elif item=='BIN': # yes or no,  male or female etc
      all_types.append('text')
    elif item=='CAT':
      all_types.append('text')
    elif item=='SUR':  
      all_types.append('text') # the original sur type 
  command_str="create table samples (";
  #print all_data_types_new
  for i,item in enumerate(all_features):
    command_str=command_str+"\""+item+"\" "+all_types[i]
    if i!=len(all_features)-1:
      command_str+=", " 
  command_str+=")"
  #print command_str
  c.execute(command_str)
  # skip the third line if it contains category information
  if feature_category_exists:
    line=sample_file_handle.readline().rstrip()
  # now insert all data to the table
  # c.execute("insert into samples values ('2006-01-05','BUY','RHAT',100,35.14)")        
  # identify the SUR type position(s)
  sur_pos=[]
  for i,item in enumerate(all_data_types):
    if item=="SUR":
      sur_pos.append(i+1)
  # now insert data to table
  line=sample_file_handle.readline().rstrip()
  while line!='':
    orig_fields=line.split('\t') 
    fields=[]
    for i,item in enumerate(orig_fields):
      fields.append(item)
      if i in sur_pos:
        # remove quotes if necessary
        if (item.startswith('"') and item.endswith('"')) or (item.startswith("'") and item.endswith("'")):
          item=item[1:-1]
        item_time,item_event=item.split(',')
        fields.append(item_time)
        fields.append(item_event)
    command_str="insert into samples values ("
    for i,item in enumerate(fields):
      if all_types[i]=='real':
        if item.upper()!='NA': 
          command_str+=item
        else:
          command_str+='null'
      elif all_types[i]=='text' or all_types[i]=='text unique':
        if item.upper()!='NA': 
          command_str+=("'"+item+"'")
        else:
          command_str+='null'
      if i!=len(fields)-1:
        command_str+=','
    command_str+=")"
    #print command_str
    c.execute(command_str)
    line=sample_file_handle.readline().rstrip()
  conn.commit()
  c.close()
  sample_file_handle.close()


def print_track_info_json(f, label):
  label=re.sub("[\"\']",'',label)
  if label in track_detail_info:
    json.dump(track_detail_info[label],f)
  else:
    d={}
    json.dump(d,f)

def print_track_info(f, id, network, label, type, datatype, samples, key, link, category):
  # remove " and ' in the label and key 
  # they are causing problems in the js file
  global label2ngid_file
  global usr_track
  global root_dir
  global tracks_with_sample_info_file
  label=re.sub("[\"\']",'',label)
  #key=re.sub("[\"\']",'',key)
  f.write('{\n')
  f.write('  "url": "'+output+'/tracks/'+network+'/'+str(id)+'",\n')
  if id!=0:
    f.write('  "int_url": "'+inter+'/tracks/'+str(id)+'.'+datatype+'",\n') # network independent
  else:
    f.write('  "int_url": "'+inter+'/tracks/'+str(id)+'",\n') # network independent
  f.write('  "network": "'+network+'",\n')
  f.write('  "label": "'+label+'",\n')
  f.write('  "type": "'+type+'",\n')
  f.write('  "datatype": "'+datatype+'",\n')
  if samples!='':
    f.write('  "samples": "'+samples+'",\n')
  if id in tracks_with_sample_info_file:
    f.write('  "sampleinfo": 1,\n')
  f.write('  "key": "'+key+'",\n')
  f.write('  "link": "'+link+'",\n')
  f.write('  "category": "'+category+'"\n')
  f.write('},\n')
  # also print to label2ngid.json
  label2ngid_file.write('"'+label+'":"'+str(id)+'",')
  
def print_track_file_header(trackFile, id, network, label, type, datatype, samples, key, link, category):
  trackFile.write('# "url": "'+output+'/tracks/'+network+'/'+str(id)+'"\n')
  if id!=0:
    trackFile.write('# "int_url": "'+inter+'/tracks/'+str(id)+"."+datatype+'"\n')
  else:
    trackFile.write('#  "int_url": "'+inter+'/tracks/'+str(id)+'",\n') # network independent
  trackFile.write('# "network": "'+network+'"\n')
  trackFile.write('# "label": "'+label+'"\n')
  trackFile.write('# "type": "'+type+'"\n')
  trackFile.write('# "datatype": "'+datatype+'"\n')
  if samples!='':
    trackFile.write('# "samples": "'+samples+'"\n')
  trackFile.write('# "key": "'+key+'"\n')
  trackFile.write('# "link": "'+link+'"\n')
  trackFile.write('# "category": "'+category+'"\n')

def create_network_info_file(input_dir, networks, file, type):
  # nsm or msm
  networkKind={}
  # if the directory contains *.msm then the kind is "msm"
  # otherwise, it is "nsm"
  for f in networks:
    if os.path.exists(os.path.join(input_dir,f+".msm")):
      networkKind[f]="msm"
    else:
      networkKind[f]="nsm"
  # first create a ruler-class dictionary
  try:
    ruler_class_file=open(os.path.join(input_dir,"rul.cls"),"r")
  except IOError:
    print "Cannot open rul.cls!" 
  ruler_class={}
  for line in ruler_class_file:
    line_items=line.rstrip().split('\t')  
    ruler_class[line_items[0]]=line_items[1]
  file.write("allRulerClass = \n{\n")
  file.write("  \"identifier\":\"ruler\",\n")
  file.write("  \"items\":[")
  i=0
  # sort network name alphabetically, the first one will be displayed when user uses NetGestalt for the first time
  for item in sorted(ruler_class.keys()):
    file.write("{\n    \"ruler\":\""+item+"\",\n")
    file.write("    \"rulerClass\":\""+ruler_class[item]+"\"\n")
    if i==len(ruler_class)-1:
      file.write("    }") 
    else:
      file.write("    },") 
    i=i+1
  file.write("]\n};\n")  

  file.write("allClasses= \n{\n")
  file.write("  \"identifier\":\"label\",\n")
  file.write("  \"items\":[")
  i=0
  all_classes=list(set(ruler_class.values()))
  # find out all the ruler classes
  for item in all_classes:
    file.write("{\n   \"name\":\""+item+"\",\n")
    file.write("   \"label\":\""+item+"\"\n")
    if i==len(all_classes)-1:
      file.write("    }")
    else: 
      file.write("    },")
    i=i+1
  file.write("]\n};\n")

  i=0
  count=len(networks)
  file.write("allNetworks=\n{\n")
  for f in networks:
    file.write("  \""+f+"\":{\n")
    file.write("    \"type\":\""+type+"\",\n")
    file.write("    \"view\":\""+ruler_class[f]+"\",\n")
    if f in mapping_status:
      file.write("    \"mapping_status\":\""+str(mapping_status[f])+"\",\n")
    else:
      file.write("    \"mapping_status\":\"0\",\n")
    file.write("    \"kind\":\""+networkKind[f]+"\"\n")
    if i<count-1:
      file.write("    },\n")
    else: 
      file.write("    }\n")
    i=i+1
  file.write("};\n")

  file.write("networkInfo = \n[\n")
  count=len(networks)
  i=0
  for f in networks:
    ruler_file=open(os.path.join(input_dir,f)+".rul","r")
    length=0
    for line in ruler_file:
      if RepresentsInt(line.rstrip().split('\t')[0]):
        length=length+1
    #print(length) 
    file.write("  {\n")
    file.write("    \"length\" : "+str(length)+",\n")
    file.write("    \"name\" : \""+f+"\",\n")
    file.write("    \"type\" : \""+type+"\",\n")
    file.write("    \"kind\" : \""+networkKind[f]+"\",\n")
    if networkKind[f]=="msm":
      file.write("    \"default_track\" : [\""+f+"\"],\n")
    if f in mapping_status:
      file.write("    \"mapping_status\":\""+str(mapping_status[f])+"\",\n")
    else:
      file.write("    \"mapping_status\":\"0\",\n")
    file.write("    \"view\" : \""+ruler_class[f]+"\",\n")
    #file.write("    \"rulerClass\" : \""+ruler_class[f]+"\",\n")
    file.write("    \"end\" : "+str(length)+",\n")
    file.write("    \"start\" : 0,\n")
    file.write("    \"sbt_categories\" : "+"\""+output+"/tracks/"+f+"/sbt_categories"+"\",\n")  
    if os.path.exists(os.path.join(input_dir,f)+".hmi"):
      file.write("    \"module_info\" : "+"\""+output+"/modules/"+f+"/modules"+"\",\n")  
    if os.path.exists(os.path.join(input_dir,f)+".net"):
      file.write("    \"network\" : "+"\""+output+"/networks/"+f+"/network"+"\"\n")  
    else:
      file.seek(-2,2)
      file.write("\n")
    file.write("  }")
    if i<count-1:  
      file.write(",\n")
    else:
      file.write("\n")
    ruler_file.close()
    i=i+1
  file.write("];")

def RepresentsInt(s):
  try: 
    int(s)
    return True
  except ValueError:
    return False

if __name__ == "__main__":
  main()

