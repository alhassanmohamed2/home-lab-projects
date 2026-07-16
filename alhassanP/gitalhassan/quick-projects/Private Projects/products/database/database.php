<?php
class Database
{
  private $host = 'localhost';
  private $user = 'root';
  private $password = '';
  protected  $connection;
  function __construct($host = '', $user = '', $password = '')
  {
    if ($host != '' && $user != '') {
      $this->host = $host;
      $this->user = $user;
      $this->password = $password;
      $this->connection = mysqli_connect($this->host, $this->user, $this->password);
    } else {
      $this->connection = mysqli_connect($this->host, $this->user, $this->password);
    }

    if (mysqli_connect_errno()) {
      echo '<script>alert("Error in the Database Conncetion!");</script>';
    }
  }

  function Errors()
  {
    if (mysqli_error($this->connection)) {
      print_r(mysqli_error($this->connection));
    }
  }
  function __destruct()
  {
    mysqli_close($this->connection);
  }
}
