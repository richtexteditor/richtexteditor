<?php

$file=$_FILES["fileforphp"];
$filename=$file["name"];
$filepath=$file["tmp_name"];

function GetFolder($path)
{
	if(strpos($path,"\0"))throw (new Exception("Invalid path !!"));
    $path=str_replace("\\",DIRECTORY_SEPARATOR,$path);
    $path=str_replace("/",DIRECTORY_SEPARATOR,$path);
	$p=strrpos($path,DIRECTORY_SEPARATOR);
	if($p)
	{
		$path=substr($path,0,$p);
	}
	return $path;
}

function GUID()
{
    if (function_exists('com_create_guid') === true)
    {
        return trim(com_create_guid(), '{}');
    }

    return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
}

//TODO:convert any image to JPG

$folder=GetFolder($_SERVER['SCRIPT_FILENAME']);
$newfilename=GUID();
$newfilename="$newfilename.jpg";

$foldername="imageuploads";

$splash=DIRECTORY_SEPARATOR;

$phydir="$folder$splash$foldername";

if(!is_dir($phydir))
{
    mkdir($phydir,0777);
}

move_uploaded_file($filepath,"$phydir$splash$newfilename");

echo("READY:$foldername/$newfilename")

?>