export const cartTableSql = `
  CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    product_variant_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uniq_cart_item (user_id, product_id, product_variant_id),
    KEY idx_cart_items_user_id (user_id),
    KEY idx_cart_items_product_id (product_id),
    KEY idx_cart_items_variant_id (product_variant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const wishlistTableSql = `
  CREATE TABLE IF NOT EXISTS wishlist_items (
    wishlist_item_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (wishlist_item_id),
    UNIQUE KEY uniq_wishlist_item (user_id, product_id),
    KEY idx_wishlist_items_user_id (user_id),
    KEY idx_wishlist_items_product_id (product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;
