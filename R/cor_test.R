#this is Jing's comment
#this is Zhiao's comment
# multiple correlation test 

# fd: 2d matrix (passed in as a column major 1d vector)
cor_test<-function(td, fd, n_row, test_method){
 debug<-FALSE
	if(debug){
	 output<-"/tmp/Rdata_debug"
		write(fd,file=output)
		write("------",file=output,append=TRUE)
		write(length(fd),file=output,append=TRUE)
	}
 myttest<-function(x, fd, test_method){
	if(debug){
	 write(length(x), file=output, append=TRUE)
	}
#	 write(x, file=output, ncolumns=length(x), append=TRUE)
	if(all(is.na(x))){
	 return(list(statistic=NA,p.value=NA))
	}
	if (length(x[!is.na(x)]) < 3)
	{	
	 return(list(statistic=NA,p.value=NA))
	}

	if (debug)
	{
	 write(x, file=output, append=TRUE)
	 write(length(x[!is.na(x)]), file=output, append=TRUE)
	
	}
	
	result<-cor.test(x,fd, method=test_method)
	 return(list(statistic=result$estimate,p.value=result$p.value))
 }
# convert vector to matrix
 fd[fd>0.999e308] <- NA
 td[td>0.999e308] <- NA
	m<-matrix(td, n_row)
	if(debug){
	 write(dim(m), file=output, append=TRUE)
	}
#	write(m, file = "/tmp/Rdata_debug",append=TRUE)
#	return(as.vector(m))
	res<-apply(m, 1, myttest, fd, test_method)  # by row
# return
	stat<-sapply(res, function(x) { x$statistic })
	pval<-sapply(res, function(x) { x$p.value })
	return(list(statistic=stat, p.value=pval))
}
