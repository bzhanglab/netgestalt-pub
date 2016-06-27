<?php
$filepath=$_GET["path"];
header('Content-disposition: attachment; filename="NetGestalt.pdf"');
header('Content-type: application/pdf');
readfile($filepath);
?>
