# multiple fisher's exact test 

# d: 2d matrix (passed in as a ROW major 1d vector)
#   gene_name num1 num2 num3 num4 
#   ----------------------------------------------------------------------------------------
#   gene_1    x     x     x     x
#   gene_2    x     x     x     x
#   ....     ...   ...   ...   ...
#
# n_row
# data: a vector with 4 numbers
library(MASS)
#write("abc",file="/tmp/fisher_Rdata")
fisher_test<-function(d, n_row){
	my_fisher_test<-function(x){
	  if(x[1]==0 || x[1]/x[2]<(x[1]+x[2])/sum(x)){  # these cases definitely will not be significant
		  #write(1,file="/tmp/fisher_Rdata", append=TRUE)
		  return(list(p.value=1))
		}
		else{
			result<-fisher.test(matrix(x,2,byrow=TRUE), workspace=1e9)
		  #write(result$p.value,file="/tmp/fisher_Rdata", append=TRUE)
			return(list(p.value=result$p.value))
		}
	}
# convert vector to matrix
  m<-matrix(d, nrow=n_row, byrow=TRUE)
	#write(n_row, file="/tmp/fisher_Rdata")
	#write(d, file="/tmp/fisher_Rdata", append=TRUE)
	#write("xxxxxxxx", file="/tmp/fisher_Rdata", append=TRUE)
	#write.matrix(m, file="/tmp/fisher_Rdata2")
#	return(as.vector(m))
	res<-apply(m, 1, my_fisher_test)  # by row
	pval<-sapply(res, function(x) { x$p.value })
# do multiple test correction
  new_p<-p.adjust(pval, method="fdr")  
	#write(new_p, file = "/tmp/fisher_Rdata",append=TRUE)
	return(list(p.value=new_p))
}
