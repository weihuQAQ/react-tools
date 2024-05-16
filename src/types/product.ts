export interface NormalProductSku {
  id: string;
  color: string;
  isNew: boolean;
  sale: boolean;
  flashSale: boolean;
}

export interface NormalProduct {
  id: string;
  prodType: string;
  collection: string[];
  skuBestSeller: number;
  gender: string[];
  skus: NormalProductSku[];
}
