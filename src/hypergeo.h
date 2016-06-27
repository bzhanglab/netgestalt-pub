#ifndef _HYPERGEO_H_
#define _HYPERGEO_H_

double alnfac ( int n );
double alngam ( double xvalue, int *ifault );
double alnorm ( double x, bool upper );
double chyper ( bool point, int kk, int ll, int mm, int nn, int *ifault );
int i4_min ( int i1, int i2 );
double r8_abs ( double x );
double r8_max ( double x, double y );

#endif
