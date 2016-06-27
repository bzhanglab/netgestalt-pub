<?php
    # ##### The server-side code in PHP ####

    # Type sent as part of the URL:
    $type = $_POST['type'];
    # Get the raw POST data:
//    $data = file_get_contents('php://input');
    $data = $_POST["content"];

    # Set the content type accordingly:
    if ($type == 'png') {
        $data = base64_decode($data);
        header('Content-Type: image/png');
    } elseif ($type == 'pdf') {
        $data = base64_decode($data);
        header('Content-Type: application/pdf');
    } elseif ($type == 'svg') {
       header('Content-Type: image/svg+xml');
    } elseif ($type == 'graphml' || $type == 'xgmml') {
        header('Content-Type: text/xml');
    } elseif ($type == 'sif') {
        header('Content-Type: text/plain');
    }

    # To force the browser to download the file:
    header('Content-Disposition: attachment; filename="network.' . $type . '"');
    #header('Content-Length: '.(string)strlen($data));
    # Send the data to the browser:
    print $data;
?>
