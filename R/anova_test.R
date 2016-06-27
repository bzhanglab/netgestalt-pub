# multiple anova-test

# d: 2d matrix (passed in as a column major 1d vector)
# test_kind: anova or kruskal
# anova model: name_x~name_y (x is a data vector, y is a factor)
anova_test<-function(test_kind, d, n_row, g, name_x, name_y){
	debug<-TRUE
	if(debug){
	 output<-"/tmp/Rdata_debug"
		write("anova",file=output)
		write("------",file=output,append=TRUE)
	}


# write(test_kind,file="/tmp/Rdata_debug")
  # g: a vector giving the group for the corresponding elements of 'x'
  myanovatest<-function(x, test_kind, g, name_x, name_g){
    #write(x, file="/tmp/Rdata_debug", append=TRUE)
    #write(g, file="/tmp/Rdata_debug", append=TRUE)
    if(all(is.na(x))){
      return(list(statistic=NA,p.value=NA))
    }
		#g<-as.integer(g)
    if(test_kind=="anova"){
      #write("ok", file="/tmp/Rdata_debug", append=TRUE)
      # create a factor
      fg<-factor(g)
	
	if (debug)
	{
		write(paste("g=",g), file=output, append=TRUE);
		write(fg, file=output, append=TRUE);
	}
      #write(fg, file="/tmp/Rdata_debug", append=TRUE)
      #write("ok2", file="/tmp/Rdata_debug", append=TRUE)
      # create data frame  
      df<-data.frame(x, fg)
      colnames(df)<-c(name_x, name_g)
      #write.table(df, file="/tmp/Rdata_debug", append=TRUE)
      frm<-paste(name_x, name_g, sep="~")
      #write(frm, file="/tmp/Rdata_debug", append=TRUE)

	if (debug)
	{
		write(paste("frm=",frm), file=output, append=TRUE);
		write(paste(df), file=output, append=TRUE);
		write(dim(df), file=output, append=TRUE);
			
		write(paste("factor levels=",df[!is.na(df[,1]),2]), file=output, append=TRUE);
		write(paste("factor num=",length(unique(df[!is.na(df[,1]),2]))), file=output, append=TRUE);
	}
	if (length(unique(df[!is.na(df[,1]),2])) > 1)
	{
	  

      	 result<-aov(as.formula(frm), data=df)
      #write("ok3", file="/tmp/Rdata_debug", append=TRUE)
	 if (debug)
	 {
		write(paste("result=", result), file=output, append=TRUE);
		
	 }      
	 sumry=summary(result)[[1]]
			#capture.output(summary(result), file="/tmp/Rdata_debug", append=TRUE)

      	 p_val=sumry[["Pr(>F)"]][1]
      	 stat=sumry[["F value"]][1] 
      	 return(list(statistic=stat,p.value=p_val))
	}else
	{
	  if (debug)
	 {
		write(paste("skipped gene"), file=output, append=TRUE);
		
	 }      
	 
	 return(list(statistic=NA, p.value=NA))
	}
    }
    else if(test_kind=="kruskal"){
	if (debug)
	{
		write(paste("kruskal debug"), file=output, append=TRUE);
		write(paste(x), file=output, append=TRUE);
		write(paste(g), file=output, append=TRUE);
			
	#	write(paste("factor levels=",df[!is.na(df[,1]),2]), file=output, append=TRUE);
		write(paste("factors=",unique(g)), file=output, append=TRUE);

		write(paste("factor num=",length(unique(g[!is.na(x)]))), file=output, append=TRUE);
	}
	
	if (length(unique(g[!is.na(x)]))>1)
	{
      		result<-kruskal.test(x,g) 
      		return(list(statistic=result$statistic,p.value=result$p.value))
	}else
	{

	 	return(list(statistic=NA, p.value=NA))
	
	}
    }
  }
#	write(n_row, file="/tmp/Rdata_debug", append=TRUE)
#	write(g, file="/tmp/Rdata_debug", append=TRUE)
# write(d, file="/tmp/Rdata_debug", append=TRUE)
#	write(name_x, file="/tmp/Rdata_debug", append=TRUE)
#	write(name_y, file="/tmp/Rdata_debug", append=TRUE)
#  # convert vector to matrix
  d[d>0.999e308] <- NA


  m<-matrix(d, n_row)
  #write(dim(m), file="/tmp/Rdata_debug", append=TRUE)
  res<-apply(m, 1, myanovatest, test_kind, g, name_x, name_y)  # by row
#  # return
	
	  if (debug)
	 {
		write(paste("res done"), file=output, append=TRUE);
		
	 }      
	
  stat<-sapply(res, function(x) { x$statistic })
  pval<-sapply(res, function(x) { x$p.value })
	
	statclassinit=class(stat);
	pvalclassinit=class(stat);
	#convert any NULLs to NAs
	stat[stat=="NULL"] <- NA; 
	pval[pval=="NULL"] <- NA;
		
	stat=as.numeric(stat);
	pval=as.numeric(pval);
	 if (debug)
	 {
		write(paste("returning"), file=output, append=TRUE);
		write(paste("stat=", stat), file=output, append=TRUE);
		write(paste("pval=", pval), file=output, append=TRUE);
		
		write(paste("stat_class=", class(stat)), file=output, append=TRUE);
		write(paste("pval_class=", class(pval)), file=output, append=TRUE);
		write(paste("stat_class init=", class(statclassinit)), file=output, append=TRUE);
		write(paste("pval_class init=", class(pvalclassinit)), file=output, append=TRUE);
	 }      
	
  return(list(statistic=stat, p.value=pval))
#  return(list(statistic=stat[1:5], p.value=pval[1:5]))
# return(list(statistic=c(NA, 0.935321671769129, NA, 0.474419937390126, NA, NA), p.value=c(NA, 0.0715418152992469, NA, 0.881394938009556, NA, NA)))
}
