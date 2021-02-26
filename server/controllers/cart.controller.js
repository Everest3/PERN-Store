const pool = require("../db");

const getCart = async (req, res) => {
  const userId = req.user.id;

  // check if cart exists
  const {
    rows,
  } = await pool.query(
    "SELECT EXISTS (SELECT * FROM cart where user_id = $1)",
    [userId]
  );

  try {
    if (!rows[0].exists) {
      // create cart for user if cart not found
      await pool.query(
        "INSERT INTO cart(user_id) values($1) returning cart.id",
        [userId]
      );
    }

    // get cart id
    const {
      rows: cartId,
    } = await pool.query("SELECT id from cart where user_id = $1", [userId]);

    // get cart items
    const cart = await pool.query(
      `SELECT products.*, cart_item.quantity, round((products.price * cart_item.quantity)::numeric, 2) as subtotal from users
      join cart on users.user_id = cart.user_id
      join cart_item on cart.id = cart_item.cart_id
      join products on products.product_id = cart_item.product_id
      where users.user_id = $1
      `,
      [userId]
    );

    res.json({ items: cart.rows, cartId: cartId[0].id });
  } catch (error) {
    res.status(401).send(error);
    throw error;
  }
}

// add item to cart
const addItem = async (req, res) => {
  const { cart_id, product_id, quantity } = req.body;

  try {
    const isProductExist = await pool.query(
      "SELECT * FROM cart_item WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );
    if (isProductExist.rowCount > 0) {
      await pool.query(
        "UPDATE cart_item set quantity = cart_item.quantity + 1 WHERE cart_id = $1 AND product_id = $2 returning *",
        [cart_id, product_id]
      );
      const product = await pool.query(
        "Select products.*, cart_item.quantity, round((products.price * cart_item.quantity)::numeric, 2) as subtotal from cart_item join products on cart_item.product_id = products.product_id where cart_item.cart_id = $1",
        [cart_id]
      );
      res.status(200).json({
        msg: "Product already in cart. Quantity increased",
        data: product.rows,
      });
    } else {
      await pool.query(
        "INSERT INTO cart_item(cart_id, product_id, quantity) VALUES($1, $2, $3) returning *",
        [cart_id, product_id, quantity]
      );
      const product = await pool.query(
        "Select products.*, cart_item.quantity, round((products.price * cart_item.quantity)::numeric, 2) as subtotal from cart_item join products on cart_item.product_id = products.product_id where cart_item.cart_id = $1",
        [cart_id]
      );
      res.status(200).json({ data: product.rows });
    }
  } catch (error) {
    res.status(401).send(error);
  }
};

// delete item from cart
const deleteItem = async (req, res, next) => {
  const { cart_id, product_id } = req.body;
  try {
    const {rows} = await pool.query(
      "delete from cart_item where cart_id = $1 AND product_id = $2 returning *",
      [cart_id, product_id]
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(401).send(error);
  }
}

// increment item quantity by 1
const increaseItemQuantity = async (req, res, next) => {
  const { cart_id, product_id } = req.body;
  try {
    await pool.query(
      "update cart_item set quantity = quantity + 1 where cart_item.cart_id = $1 and cart_item.product_id = $2",
      [cart_id, product_id]
    );
    const product = await pool.query(
      "Select products.*, cart_item.quantity, round((products.price * cart_item.quantity)::numeric, 2) as subtotal from cart_item join products on cart_item.product_id = products.product_id where cart_item.cart_id = $1",
      [cart_id]
    );
    res.json(product.rows);
  } catch (error) {
    res.status(500).json(error);
  }
}

// decrement item quantity by 1
const decreaseItemQuantity = async (req, res, next) => {
  const { cart_id, product_id } = req.body;

  try {
    await pool.query(
      "update cart_item set quantity = quantity - 1 where cart_item.cart_id = $1 AND cart_item.product_id = $2 returning *",
      [cart_id, product_id]
    );
    const product = await pool.query(
      "Select products.*, cart_item.quantity, round((products.price * cart_item.quantity)::numeric, 2) as subtotal from cart_item join products on cart_item.product_id = products.product_id where cart_item.cart_id = $1",
      [cart_id]
    );
    res.json(product.rows);
  } catch (error) {
    res.status(500).json(error);
  }
}

module.exports = {
  getCart,
  addItem,
  increaseItemQuantity,
  decreaseItemQuantity,
  deleteItem
}