# multiple t-test 

# d: 2d matrix (passed in as a column major 1d vector)
#   gene_name sample_1/a sample_2/a ... sample_m/a sample_m+1/b sample_m+2/b ... sample_m+n/b
#   ----------------------------------------------------------------------------------------
#   gene_1    x          x         ...  x           x            x           ... x
#   gene_2    x          x         ...  x           x            x           ... x
#   ....
# direction: 0 - a vs b, 1 - b vs a
# l1: length of first vector
# l2: length of second vector
t_test<-function(test_kind, d, n_row, direction, l1, l2){
# output=paste("/tmp/Rdata",as.character(direction),sep="_")
	 output<-"/tmp/Rdata_debug"
		write("t_test",file=output)
	
	myttest<-function(x, test_kind, dir,s1,s2){
#	  write(x, file=output, ncolumns=length(x), append=TRUE)
	  if(all(is.na(x))){
			return(list(statistic=NA,p.value=NA))
		}
		set1=x[1:s1];
		set2=x[(s1+1):(s1+s2)];
		if (direction==1)
		{
			set1=x[1:s2];
			set2=x[(s2+1):(s2+s1)];
		}
		write(paste("s1=", set1), file=output, append=TRUE);
		write(paste("s2=", set2), file=output, append=TRUE);
		write(paste("l1=", length(set1[!is.na(set1)])), file=output, append=TRUE);
		write(paste("l2=", length(set2[!is.na(set2)])), file=output, append=TRUE);
	
	  if ((length(set1[!is.na(set1)]) < 2) | (length(set2[!is.na(set2)]) < 2))
	  {
		
		write(paste("skipping..."), file=output, append=TRUE);

		return(list(statistic=NA, p.value=NA))
	  }
		
		write(paste("testing..."), file=output, append=TRUE);

		if(dir==0){
		  if(test_kind=="ttest"){ 
			  result<-t.test(x[1:s1],x[(s1+1):(s1+s2)])
			}
			else if(test_kind=="wilcoxon"){
			  result<-wilcox.test(x[1:s1],x[(s1+1):(s1+s2)])
			}
			return(list(statistic=result$statistic,p.value=result$p.value))
		}
		else{
		  if(test_kind=="ttest"){
			  result<-t.test(x[1:s2],x[(s2+1):(s1+s2)])
			}
			else if(test_kind=="wilcoxon"){
			  result<-wilcox.test(x[1:s2],x[(s2+1):(s1+s2)])
			}
			return(list(statistic=result$statistic,p.value=result$p.value))
		}
	}
	# convert vector to matrix
	d[d>0.999e308] <- NA
  m<-matrix(d, n_row)
#	write(dim(m), file="/tmp/Rdata")
#	write(m, file = "/tmp/Rdata",append=TRUE)
#	return(as.vector(m))
	res<-apply(m, 1, myttest, test_kind, direction, l1, l2)  # by row
	# return
  stat<-sapply(res, function(x) { x$statistic })
	pval<-sapply(res, function(x) { x$p.value })
	return(list(statistic=stat, p.value=pval))
}
