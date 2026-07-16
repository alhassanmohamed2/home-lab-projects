<?php

class DataQuery extends Database
{
    public $data_array = array();

    function select($database, $table, $rows)
    {

        $query = "SELECT $rows FROM $database.$table ";
        $result = mysqli_query($this->connection, $query);


        while ($data_array = mysqli_fetch_array($result, MYSQLI_NUM)) {
            array_push($this->data_array, $data_array);
        }
        $this->Errors();
        mysqli_free_result($result);
        return $this->data_array;
    }

    function table_create($class)
    {
        echo "<table class= '$class' >";

        for ($i = 0; $i < count($this->data_array); $i++) {
            echo '<tr>';
            for ($j = 0; $j < count($this->data_array[$i]); $j++) {
                echo '<td>' . $this->data_array[$i][$j] . '</td>';
            }
            echo '</tr>';
        }
        echo '</table>';
        $this->data_array = array();
    }

    function insert($database, $table, $rows, $values)
    {
        $query = "INSERT INTO $database.$table ($rows)
        VALUES ($values)";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }

    function delete($database, $table, $id)
    {
        $query =  "DELETE FROM $database.$table WHERE id=$id";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }
    function update($database, $table, $column, $values, $id)
    {
        $query =  "UPDATE $database.$table SET $column=$values WHERE id=$id";
        mysqli_query($this->connection, $query);
        $this->Errors();
    }
}
