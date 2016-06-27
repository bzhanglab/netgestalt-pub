GSEA_KS <- function (x, y, ..., alternative = c("two.sided", "less", "greater"), exact = NULL) 
{
    pkolmogorov1x <- function(x, n) {
        if (x <= 0) 
		return(0)
        if (x >= 1) 
		return(1)
        j <- seq.int(from = 0, to = floor(n * (1 - x)))
        1 - x * sum(exp(lchoose(n, j) + (n - j) * log(1 - x - 
													  j/n) + (j - 1) * log(x + j/n)))
    }
    alternative <- match.arg(alternative)
    DNAME <- deparse(substitute(x))
    x <- x[!is.na(x)]
    n <- length(x)
    if (n < 1L) 
	stop("not enough 'x' data")
    PVAL <- NULL
    if (is.numeric(y)) {
        DNAME <- paste(DNAME, "and", deparse(substitute(y)))
        y <- y[!is.na(y)]
        n.x <- as.double(n)
        n.y <- length(y)
        if (n.y < 1L) 
		stop("not enough 'y' data")
        if (is.null(exact)) 
		exact <- (n.x * n.y < 10000)
        METHOD <- "Two-sample Kolmogorov-Smirnov test"
        TIES <- FALSE
        n <- n.x * n.y/(n.x + n.y)
        w <- c(x, y)
		
		order_w <- order(w,decreasing=T)
        z_old <- cumsum(ifelse(order(w,decreasing=T) <= n.x, 1/n.x, -1/n.y))
		z <- z_old
		
        if (length(unique(w)) < (n.x + n.y)) {
            warning("cannot compute correct p-values with ties")
            z <- z[c(which(diff(sort(w)) != 0), n.x + n.y)]
            TIES <- TRUE
        }
		
		
		maxS <- max(z)
		minS <- min(z)
		
		leadingedge <- vector()
		D1 <- 0
		if(maxS > abs(minS)){
			po <- which(z_old==maxS)
			allP <- order_w[c(1:po)]
			leadingedge <- allP[allP<=n.x]
			D1 <- maxS
		}else{
			po <- which(z_old==minS)
			allP <- order_w[c(po:length(order_w))]
			leadingedge <- allP[allP<=n.x]
			D1 <- minS
		}		
		
		
		
        STATISTIC <- switch(alternative, two.sided = max(abs(z)), 
							greater = max(z), less = -min(z))
        nm_alternative <- switch(alternative, two.sided = "two-sided", 
								 less = "the CDF of x lies below that of y", greater = "the CDF of x lies above that of y")
        if (exact && (alternative == "two.sided") && !TIES) 
			PVAL <- 1 - .Call(C_pSmirnov2x, STATISTIC, n.x, n.y)
    }
    else {
      cat("y shoud be numeric!\n")
	  return()
    }
    names(STATISTIC) <- switch(alternative, two.sided = "D", 
							   greater = "D^+", less = "D^-")
    if (is.null(PVAL)) {
        
        pkstwo <- function(x, tol = 1e-06) {
            if (is.numeric(x))
            x <- as.vector(x)
            else stop("argument 'x' must be numeric")
            p <- rep(0, length(x))
            p[is.na(x)] <- NA
            IND <- which(!is.na(x) & (x > 0))
            if (length(IND)) {
                p[IND] <- .Call(stats:::C_pKS2, p = x[IND], tol)
            }
            return(p)
        }

        
        PVAL <- ifelse(alternative == "two.sided", 1 - pkstwo(sqrt(n) * 
															  STATISTIC), exp(-2 * n * STATISTIC^2))
    }
    PVAL <- min(1, max(0, PVAL))
    RVAL <- list(D1=D1, leadingedgeIndex=sort(leadingedge), statistic = STATISTIC, p.value = PVAL, alternative = nm_alternative, 
				 method = METHOD, data.name = DNAME)
    class(RVAL) <- "htest"
    return(RVAL)
}
