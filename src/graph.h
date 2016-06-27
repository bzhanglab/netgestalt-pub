#ifndef __GRAPH_H__
#define __GRAPH_H__

// Graph class
#include <vector>
#include <queue>
#include <stack>
#include <set>
#include <list>
#include <map>
#include <fstream>
#include <iostream>
#include <cstdlib>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <cfloat>
#include <limits>
#include "json.hh"
#include "json_st.hh"
using namespace std;
using namespace JSON;

//typedef float weight_t;
typedef float weight_t;
const weight_t INF = numeric_limits<weight_t>::infinity();
const int INT_INF = numeric_limits<int>::max();
const weight_t EPS=1.0e-6;

// nodes are integers (0, 1, ...) and may have labels
// edges are represented indirectly:
//   each node has a set of its neighbors
// there is no constructor; must read graph from a file before using it
// the caller of read() decides how many nodes there will be
// then edges are read by read() from the edgeFile
// undirected for now
class Graph {
  int n_nodes;
  int n_edges;
  vector<weight_t> n_weight;  // node weight (id->value)
  vector<weight_t> e_weight;   // edge weight (id->value)
  map<string, int> nodemap;  //node name --> node id
  map<int, string> r_nodemap;  // node id --> node name
  map<pair<int,int>, int> edgemap;  /* edge pair -> edge_id */
  map<int, pair<int, int> > r_edgemap; /* edge_id -> pair */
  public:
  bool digraph; // for now this is "false" 
  bool edge_weighted;
  bool node_weighted;
  vector<vector<int> > neighbors; // for each vertex a set of neighbors
  /* overloading assignment operator */
  Graph();
  Graph& operator=(const Graph& g);
  int getNodeCount() const;
  int getEdgeCount() const;
  bool directed() { return digraph;} 
  weight_t getEdgeWeight(int n1, int n2); /* return the weight of edge connecting node n1 and n2 */
  weight_t getEdgeWeight(int e) const; /* return weight by edge id */
  weight_t getNodeWeight(int n) const;
  vector<weight_t>& getNodeWeightVector();
  vector<weight_t>& getEdgeWeightVector();
  map<pair<int,int>,int>& getEdgeMap();
  map<int, pair<int,int> >& getREdgeMap();
  map<int, string>& getRNodeMap();
  map<string, int>& getNodeMap();
  vector<vector<int> >& getNeighbors();
  void setNodeCount(int n);
  void setEdgeCount(int e);
  bool isNeighbor(int n1, int n2);
  pair<int,int> edgePair(int n1, int n2); /* return pair of (n1,n2) (n1<n2) */
  int edge2id(int,int);
  int node2id(string node);
  string id2node(int nid);
  pair<int, int> id2edge(int eid);
  bool checkEdgeWeight();
  //int readGraph(string ppi_file, string file_name, fileType ft, weightType wt);
  int readGraph(vector<string> files, bool edgeWeighted, bool nodeWeighted, bool directed);
  int readGraph(Value v);
  int readNodeFile(string file_name);
  int readEdgeFile(string file_name, bool edge_weighted, bool directed);
  int degree(int node);
  void printDegreeSeq(); /* print degree sequence */
  void Component_Count(int index, int cn, int *c);
  Graph* largestComponent();
  Graph* subNetwork(vector<int>& nids); /* node induced subnetwork */
};

#endif
