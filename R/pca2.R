prcomp_WGCNA <- function(exp) {
    require(WGCNA)
    col <- rep("black",nrow(exp))
    pc <- moduleEigengenes(t(exp),col)
    pc <- pc$eigengenes
    pc <- pc[,1]
    names(pc) <- colnames(exp)
    return(pc)
}

# suppress message when the package loads
sink("/dev/null")
# WGCNA package
ng_pca <- function(d, sample_size, module_size){
    suppressMessages(library(WGCNA))
		i<-1
		scores<-list()
		d[d>0.999e308] <- NA
		start<-1
		# mod_size: the number of genes in the current module
		for(mod_size in module_sizes){
			m<-matrix(d[start:(start+mod_size*sample_size-1)], ncol=sample_size)
			mt<-t(m)
			col<-rep("black", mod_size)
			all_na<-which(apply(mt, 2, function(x) all(is.na(x))))
			if(length(all_na)>0){
				mt<-mt[,-all_na]
			}
			res<-moduleEigengenes(na.omit(mt),col)$eigengenes[,1]
			if(length(all_na)>0){
				res<-insert.at(res, all_na, 1e308)
			}
			scores[[as.character(i)]]<-res
			i<-i+1
			start<-start+mod_size*sample_size
		}
		return(scores)
}
