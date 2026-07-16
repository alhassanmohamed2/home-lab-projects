<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="shortcut icon" type="image/jpg" href="https://icons-for-free.com/iconfiles/png/512/linecon+products+round+icon-1320165923260225670.png" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-KyZXEAg3QhqLMpG8r+8fhAXLRk2vvoC2f3B09zVXn8CA5QIVfZOJ3BCsw2P0p/We" crossorigin="anonymous">
    <title>Products</title>
</head>

<body>
    <?php
    include 'database/datasys.php';

    $product_query = new DataQuery();
    $product_array = $product_query->select('flsk', 'products limit 10 ',
    'product_name,brand, image , retail_price,discounted_price,product_url');

    for ($i = 0; $i < count($product_array); $i++) {

        $product_name = $product_array[$i][0];
        $brand = $product_array[$i][1];
        $image_array = explode(",", ltrim(rtrim($product_array[$i][2], ']'), '['));
        $retail_price = $product_array[$i][3];
        $discounted_price = $product_array[$i][4];
        $product_url = $product_array[$i][5];
        $img_array_ele = '';
        for ($j = 0; $j < count($image_array); $j++) {
            $img_array_ele .= '<img src='.$image_array[$j].' width="70">';
        }
        echo '
    <div class="d-flex justify-content-center container mt-5">
        <div class="card p-3 bg-white"><i class="fa fa-apple"></i>
            <div class="about-product text-center mt-2"> <div sytle="display:flex;">'. $img_array_ele . '</div>
                <div>
                    <h4>' . $product_name . '</h4>
                    <h6 class="mt-0 text-black-50">' . $brand . '</h6>
                </div>
            </div>
            <div class="stats mt-2">
                <div class="d-flex justify-content-between p-price"><span>Retail Price</span><span>' . $retail_price . ' $</span></div>
                <div class="d-flex justify-content-between p-price"><span>Discounted Price</span><span>' . $discounted_price . ' $</span></div>
            
            </div>
            <a href= ' . $product_url . ' target="_blank" >Link to the Product</a>
        </div>
    </div>
     ';
    }


    ?>
</body>

</html>


