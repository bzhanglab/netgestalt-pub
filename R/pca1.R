# PCA 
insert.at <- function(a, pos, newval){
	if(length(newval)!=1){
		stopifnot(length(newval)==length(pos))
	}
	result <- rep(NA, length(a)+length(pos))
  result[-pos] <- a
	result[pos] <- newval
  result
}
# d: a collection of 2d matrices (passed in as a column major 1d vector)
#  
#   ---------------------------------------------------------------
#                      sample_1 sample_2 ..... sample_n
#   ---------------------------------------------------------------
#   gene_1 (start)       x         x    ....   x
#   gene_2               x         x    ....   x
#   ...
#   gene_m (end)         x         x    .....  x
#  ---------------------------------------------------------------
ng_pca<-function(d, sample_size, module_sizes){
# write("debugging",file="/tmp/Rdata_debug")
# write(module_sizes,file="/tmp/Rdata_debug")
# convert vector to matrix
  i<-1
  scores<-list()
  d[d>0.999e308] <- NA
	start<-1
#  write(d[1:100], file="/tmp/Rdata_debug", append=TRUE)
#  write("----", file="/tmp/Rdata_debug", append=TRUE)
  for(mod_size in module_sizes){
#    write(length(d), file="/tmp/Rdata_debug", append=TRUE)
#    write(mod_size, file="/tmp/Rdata_debug", append=TRUE)
#    write(sample_size, file="/tmp/Rdata_debug", append=TRUE)
#    write(mod_size*sample_size, file="/tmp/Rdata_debug", append=TRUE)
#    write(d[start:start+mod_size*sample_size-1], file="/tmp/Rdata_debug", append=TRUE)
#    write(d[start:(start+mod_size*sample_size-1)], file="/tmp/Rdata_debug", append=TRUE)
    m<-matrix(d[start:(start+mod_size*sample_size-1)], ncol=sample_size) 
		mt<-t(m)
#   now mt is of dimension sample_size x module_size 
#		write(m, ncolumns=mod_size, file="/tmp/Rdata_debug", append=TRUE)
#   write("----", file="/tmp/Rdata_debug", append=TRUE)
#   write(dim(m), file="/tmp/Rdata_debug", append=TRUE)
#   must deal with cases where some genes is not in any of the samples
#   (the whole column of m is NA )
#   write(dim(mt), file="/tmp/Rdata_debug", append=TRUE)
    all_na<-which(apply(mt, 2, function(x) all(is.na(x))))
#   write(length(all_na), ncolumns=100, file="/tmp/Rdata_debug", append=TRUE)
	  if(length(all_na)>0){
      mt<-mt[,-all_na]
		}
		# return scores of first PC
    res<-prcomp(na.omit(mt),scale=TRUE)$x[,1]
    #write(res, ncolumns=mod_size-length(all_na), file="/tmp/Rdata_debug", append=TRUE)
    if(length(all_na)>0){
     # write("inserting ------", file="/tmp/Rdata_debug", append=TRUE)
     # write(all_na, ncolumns=length(all_na), file="/tmp/Rdata_debug", append=TRUE)
      res<-insert.at(res, all_na, 1e308) 
    }
#   write(res, ncolumns=mod_size, file="/tmp/Rdata_debug", append=TRUE)
    scores[[as.character(i)]]<-res  
    i<-i+1
		start<-start+mod_size*sample_size
	}
    return(scores)
}
