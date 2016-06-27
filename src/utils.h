#include<string>
#include<sstream>
#include<iostream>
#include<vector>
#include<stdlib.h>
#include <sys/stat.h>
#include <errno.h>

std::string ensurePath(std::string basePath, std::vector<std::string> pathElems);
std::vector<std::string> &split(const std::string &s, char delim, std::vector<std::string> &elems);
std::vector<std::string> split(const std::string &s, char delim);
std::string gen_random(const int len);
