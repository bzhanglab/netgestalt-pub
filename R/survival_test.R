# survial test 
# coxph model
survival_test<-function(test_kind, d, mytime, myevent, n_row){
# for now, test_kind is coxph, it is not used 
 require(survival)
# require(parallel)
	DEBUG<-TRUE
  DEBUG2<-FALSE
	if(DEBUG){
    debugoutput<-"/tmp/Rdata_survival"
	}
	survtest<-function(x, survobj, notna){
	  # if(DEBUG){
	  #  write(x, file=debugoutput, ncolumns=length(x), append=TRUE)
		#}
	  if(all(is.na(x))){
			return(NULL)
		}
		#data<-list(time,event,x)
    #summ<-summary(coxph(survobj~x,na.action=na.exclude))
		x<-x[notna]
		if(DEBUG){
		  write(x,ncolumns=length(x),file=debugoutput, append=TRUE, sep=",")
		}
    summ<-summary(coxph(survobj~x))
    #summ<-summary(coxph(Surv(time,event)~x),data)
		#if(DEBUG){
	#		if(summ){
       # save(summ,file=debugoutput, append=TRUE)
	#		}
#		}
		return(as.list(summ))
	}
	# convert vector to matrix
	d[d>0.999e308] <- NA
	#mytime[mytime>0.999e308] <-NA
	#myevent[myevent>0.999e308]<-NA
	notna<-which(!is.na(myevent[which(!is.na(mytime))]))
#	write(m, file = "/tmp/Rdata",append=TRUE)
#	return(as.vector(m))
#  ncores<-detectCores()
	mytime<-mytime[notna]
	myevent<-myevent[notna]
	survobj<-Surv(mytime,myevent)
	m<-matrix(d,n_row)
#	if(DEBUG){
#	  m<-m[1:20,]
#	}
	m1<-t(m)
	if(DEBUG){
	  write(dim(m), file=debugoutput)
		#write(m[1,], ncolumns=dim(m)[2], file=debugoutput,append=TRUE)
	  #write(m1, ncolumns=dim(m)[2],file=debugoutput,append=TRUE)
	  write(mytime, ncolumns=length(mytime),file=debugoutput,append=TRUE,sep=",")
	  write(myevent, ncolumns=length(myevent),file=debugoutput,append=TRUE,sep=",")
	}
	lapsed<-system.time(res<-apply(m, 1, survtest, survobj, notna))  # by row
  if(DEBUG2){
    write(lapsed[[1]],file="/tmp/R_exec_time")
    write(lapsed[[2]],file="/tmp/R_exec_time", append=TRUE)
    write(lapsed[[3]],file="/tmp/R_exec_time", append=TRUE)
  }
	# return
	# these are not parallized since it will not improve the performance too much
  res.expcoef<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$coeff[2] })  # exp(coef)
	res.logtest.test<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$logtest[['test']]})
	res.logtest.df<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$logtest[['df']]})
	res.logtest.pvalue<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$logtest[['pvalue']]})
	res.waldtest.test<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$waldtest[['test']]})
	res.waldtest.df<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$waldtest[['df']]})
	res.waldtest.pvalue<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$waldtest[['pvalue']]})
	res.sctest.test<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$sctest[['test']]})
	res.sctest.df<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$sctest[['df']]})
	res.sctest.pvalue<-sapply(res, function(x) { if(is.null(x)) return(NA) else x$sctest[['pvalue']]})

	if(DEBUG){
    write(res.expcoef, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.logtest.test, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.logtest.df, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.logtest.pvalue, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.waldtest.test, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.waldtest.df, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.waldtest.pvalue, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.sctest.test, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.sctest.df, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
    write(res.sctest.pvalue, ncolumns=dim(m)[1],file=debugoutput, append=TRUE)
  }

	return(list(expcoef=res.expcoef, waldtest.test=res.waldtest.test, 
	       waldtest.pvalue=res.waldtest.pvalue, logtest.test=res.logtest.test, 
  			 logtest.pvalue=res.logtest.pvalue, sctest.test=res.sctest.test, sctest.pvalue=res.sctest.pvalue))
}
