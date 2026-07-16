<?php
class DatabaseQuery extends Database
{

    function create_table($database, $table, $cols)
    {
        $query =  "CREATE TABLE $database.$table($cols)";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }
    function create_database($name)
    {
        $query =  "CREATE DATABASE $name";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }

    function drop_table($database, $table)
    {
        $query =  "DROP TABLE $database.$table";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }
    function drop_database($name)
    {
        $query =  "DROP DATABASE $name";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }

    function alter_table($database, $table, $method, $column, $constrians = '')
    {
        //Methods is ['ADD','DROP COLUMN','ALTER COLUMN']
        //Constrians represents data type or any other Constrians
        $query =  "ALTER TABLE $database.$table $method $column $constrians";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }
}
