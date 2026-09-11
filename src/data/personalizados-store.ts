export type PersonalizadoCategory = "Caixinhas" | "Lembrancinhas" | "Mesa & Bolo" | "Convites";

export type PersonalizadoProduct = {
  id: string;
  name: string;
  price: number;
  unit: "un" | "letra" | "arte";
  category: PersonalizadoCategory;
  imageId?: string;
  description: string;
  featured?: boolean;
};

export const PERSONALIZADOS_CATEGORIES: Array<"Todos" | PersonalizadoCategory> = [
  "Todos",
  "Caixinhas",
  "Lembrancinhas",
  "Mesa & Bolo",
  "Convites",
];

// PREÇOS PÚBLICOS DE VENDA.
// A base de custo da produção não deve ser armazenada no repositório/site público.
// Estes valores foram calculados fora do código aplicando +50% sobre o custo informado.
export const PERSONALIZADOS_PRODUCTS: PersonalizadoProduct[] = [
  {
    id: "dupla-bis",
    name: "Caixinha Dupla BIS",
    price: 3.6,
    unit: "un",
    category: "Caixinhas",
    imageId: "1gJYMjEZAbghWWLqVXMerPVEOCeJg_Cfp",
    description: "Caixinha personalizada para dois chocolates BIS, criada no tema da festa.",
    featured: true,
  },
  {
    id: "piramide",
    name: "Caixinha Pirâmide",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1tqyOrGf0cbLCmMZ7wgYo5yIR8HGqYNxN",
    description: "Modelo pirâmide personalizado, ideal para doces, lembranças e composição de mesa.",
  },
  {
    id: "sushi",
    name: "Caixinha Sushi",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1S0sZg1LHXjtqPLMbWWA4Enlirqzkzwe3",
    description: "Caixinha compacta com fechamento especial e arte personalizada.",
  },
  {
    id: "caixinha-tubete",
    name: "Caixinha Tubete",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1LkynEZlUQhWjEjXEiHnzJzcT9OTDitHV",
    description: "Embalagem personalizada para completar a papelaria e as lembrancinhas da festa.",
  },
  {
    id: "tubete-adesivo",
    name: "Tubete com Adesivo",
    price: 3.6,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1LkynEZlUQhWjEjXEiHnzJzcT9OTDitHV",
    description: "Tubete personalizado com adesivo no tema escolhido pelo cliente.",
  },
  {
    id: "milk",
    name: "Caixinha Milk",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1-_lzPC2f6F2s8ogzsWgh_DZ3hVt-3t9J",
    description: "Um dos modelos mais versáteis para doces e lembranças personalizadas.",
    featured: true,
  },
  {
    id: "bala",
    name: "Caixa Bala",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "1ju3SzcbfJn86BjqCI79tV9-fymK6t0vS",
    description: "Caixa em formato de bala para deixar a mesa ainda mais temática.",
  },
  {
    id: "meia-bala",
    name: "Caixa Meia Bala",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1ewQ-Kcz-iKL_Tjx8zzoSm-4T-_7no99v",
    description: "Versão compacta da caixa bala com personalização completa.",
  },
  {
    id: "maletinha",
    name: "Maletinha",
    price: 5.85,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1t1rosmJxOOTIRmGUu3LLW1oP-wIwcU99",
    description: "Maletinha personalizada para pequenos brindes, doces ou atividades.",
    featured: true,
  },
  {
    id: "coracao",
    name: "Caixa Coração",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "1e1fbrZvPCE3Im7ePchs9G_AJ_x4xDHJY",
    description: "Caixinha em formato de coração com arte criada para a ocasião.",
  },
  {
    id: "sacolinha",
    name: "Sacolinha Personalizada",
    price: 4.5,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1iMaFrBbMhaYg6miAn11yVIe6HTERR3CL",
    description: "Sacolinha temática para lembranças, doces e kits da festa.",
  },
  {
    id: "giz-desenho",
    name: "Caixa Giz e Desenho",
    price: 6.3,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1Op5XDHnuQZNJh8HY7dnarPLlYdTZOGQv",
    description: "Kit infantil para desenhar e colorir, personalizado no tema escolhido.",
  },
  {
    id: "forminha",
    name: "Forminha para Doces",
    price: 0.54,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "106zZC1NiWMcBWLXQV3U6wpZ4uOpZ-wo2",
    description: "Forminha personalizada para integrar os doces à identidade visual da festa.",
  },
  {
    id: "topper",
    name: "Topper de Bolo",
    price: 16.2,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "1Imj5tygkLnmWBif6-92_4nJs0r-7-CA4",
    description: "Topo de bolo personalizado com nome, idade e elementos do tema.",
    featured: true,
  },
  {
    id: "bandeirola",
    name: "Bandeirola",
    price: 2.7,
    unit: "letra",
    category: "Mesa & Bolo",
    imageId: "1V_E0KUzTBJ7mKiMKyJMzsHOPlCVGHVME",
    description: "Bandeirola personalizada cobrada por letra, ideal para nomes e frases curtas.",
  },
  {
    id: "centro-mesa",
    name: "Centro de Mesa",
    price: 5.85,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "1CuzEDBx4c16qHCiMtjKCKe6dxqgKNxoO",
    description: "Centro de mesa personalizado para decorar e presentear os convidados.",
  },
  {
    id: "convite-livro",
    name: "Convite Caixinha Livro",
    price: 7.2,
    unit: "un",
    category: "Convites",
    imageId: "data:image/webp;base64,UklGRmgYAABXRUJQVlA4IFwYAAAQdACdASrwAPAAPu1mqk4ppaQyLZnL8kAdiWwAzFCKUzSn+R+5H5b9586ndv8L/0fNifW/63q38WzpueaDznPT7/j/SQ6p3elv3StyVuX/aZtXX4Bu5Nnc4mONZNyaetG3vbtaDtQ/evPToz0OHuR8lZVt0kST21zSH/ACAZzkVXxvhSK7gRi+ehuJscO9zve04GuhRt6ZxheJGLJQgIjtlK/VPxWoRTo6mhPWBZ13djiJJMYPeUZWs3gdzQpoFO/5h6Hdzd/ppEga7c7CO3OtN4OSt7Ty1GlGSUpPDRI/htfsFeMVFC5KExr/s/BIKogssSXtMlz7OaztK9iq3hdI5ZRrymIwRuXbePl2gGCNQLnYORf8GW4ucIGD66jHNAoi/4GmLifVAx6vD4pYjcgWWg6pBU/K4+jucv49K3/OZlKEM+mqrs2uQkfCAddazgneoj+XfYngv2TWQntDgJjEOUPIwqc+6s4/UiXHI2/8q23iC1J7/iddXk/9c7yXrYpeVqWvTQLu48DSNVH4azKGFmwwB/ZdZv7juL5BBWGtSL1Ii8bPzQf0Hr7KMzHdRcawzdZgTO/KcX/NbxIq96TvLl9m5aEDoYluoBQl4TG32RaobADwDE1E7bESiTtV97/lrQMH+OgpCQzvAAWkDCPLgXfhLvFl089xoHyitlfw86QFP8FeuOmmQRIukxgwj6+SGTP1FIzqWj0n9CMgMR37HjEqpbrXLKy4MLHPLj+/WUjyY09Tr7UiiOxIz1qGdPgUxwJvozpX9A+dW2Ul4xd4MVR8XfjoK+Db7iAZ9qq7u1LdukBXm6KrAbQzhxFpJt6qGM3mdBCWNsrG2Rtw1iSAVMPxwjPz6ysUTXugISmtirMM3xl9tx8Ed2QsCiz6lofktwPyLR6/WKvl5HqfMsv/UnA7OZ4kkcgtHI0GzdDhI8qcxJmTJdZhp/Mxp+z4QFOsUsMv69kAiDo5x3PHi9uMZtvW8V3GIuhW0U+aoEfPoLNieY/DqRM7Bw1QyvIUgdReqpnS2isMTIX8P0aOy2vd0Ew/2R01r2wek3QVEqdWHoxxtMeFBc4eItxT64xyerIqLPVpw4Qr5tYZNu3rQKZes7ZrbHxqvvH18ggiQN4GgKBHNHY0Y3RIW2Kb4DE8lH99seNui4p0IOPcUsTj6eJY/3ejcGvyvdg3VSFqH3KqzCF6x9ELOfUfjvJzuixVTQRxin+T1cx4PDIbaBn5USJBMNCMkBn5UGvMAP70t6CCByPCCTeopMDgg3kLqJGW+IPNFg4Jyh6VkrzXzlP6kb8iNqsB4CwPX93KxVAA9KboyyUb5AwdXCRkJb7KGOFebd46pTENbqMDnpAhnQbq2br6s8erq0OsupAZdpksMEpX39Sco1Lfe2PEt+6Q5J6KthwD7tlm8NnQIGG+vNiEY+zk7GWVhXJGbL6oFJe5k9kGTFAuej3Dx9tomnkwz5e9vhFlG5tRvZmXEPCoIF/xVoJM8mSe+RYP8un6Vxe5fYATyf9/7+uRMg1crjGGd5SA1U3m6pUab+ffZeoWQ+vYGzU8+X93zxoGSsaAkB6xcXp8dEbL4BbBZ5Ff3UmxKzRb9lt+qj6/a7gq8NK0KHo/0VfoOFN0fdMfBFId9lhxTkdxAPBGg5j2JQ5adOJ2vPCSt+ziaAghSxCfVFwk/kOboB4TAYBiT6DTrqgRIAA8wjby/b2lSbAdudy+zciS/u25WJI8UPuQoPB73Rh7cwmaGLKNGKa1Nw9KDJZzD3yR4fvz66eis7JaJoMS06DtSCi0lYwEHBREzA1cqQ1RcWOKylDT848ZDlnEU1OVavgYM3fNu6nk+fm6ZsSPY5W+CE9JBAVqLSdwEpNBAqubc+5x5SO23yFuY1TBYsJ1MPZdqUV8trj4KEuCntxZMZna97i71/6MLkDbi2h4seVXOsRQDdZKY1X8Zf9ShyTg81l6E18e5HAc0aK7WQzTigY0ZDF5C+ysj21udOsiuQkejQFHjZ2OYBGN12U3bOxlgK7AlRjgCclOE2skzOR+ASuEH8ApdcHGOWGj9T3wE2Ugixish7//kUxQtKMxzOaEUIB5aNOqCWJ3WhfqZFNvOl0NtwoNVAPNeTITnvYtoIvjQD8DOonrlX+VM1bbNBcg1g7PbZ8qYBp7AyHAdi1MqKF7+mt4PQXvMtB1PXyNp6I6eWOBMGpqrxiklRW4QQ6hBj8AzT2SrpNgZS6InWnlR9a982hwI+vGYQSBIhysAQyyvzbhmrDcw1Nx+P07tmbwgPuWhoGF0BMAl5SMeJBdglkZGTrAFwHXD75s3LzAffPLhH876XRRXXaMyzsM0igqJkLiyM/d3A8GXbfucK7Du3HQpH/f7nGMWhMHk+4KKD5GJkSd/tumLNmJSvnjDAUZeVzZCvziNBrz73Ieg4/2N0nfzzdZf7yRX/GsdmfjcebG3IYlUZZNJQ2MVFDJA6FcOdWKcnjqHWeK3g/Rtxrsq2iYrMdYZDTssi6Qi2aGD01Qi2nNzCdVNz+KTb3LgYviCKlfGEoG1B4CV88EaxGtCbhMggwT837UzrNR5JS3OTiWP3GyODOyQqKZYr0exvo1wPnuD5j4qAvWbtHEE80J8aa9FGwDi5S7zQaZIQiRL9cPGVt+s3yfYRoFInt/+rNcId2xAwKs2PuIbvqxWEKarKSs92C66ZoA8I6j9A951xKLQ4RjoCxSJjMq2RlJtApPGwKsu4QHJIq1qznPHZWre/pDprbsXddSn2ezVuctqskOGWM85I3HQZA5ZxTlQgVLbtPzjWbeAevbloPAnmGwRV29C/4BkuLKM+y3y/6feqnSxIMUNydxTJ+EW4gjIUam0mgOv7tvE7uy7/b++xAFE2fht/HDg1e7K5SjjF0nXZkGdzgvGixfMyFZvSTN5LTVdHkhhFygTFoVLfcu9kzVwL30keuHpyFFi4YxetuSUF358aTj7JSJfqpV5qmnjIRbn+EiQUzAkPb+mS/owXa72CEVUDTF3jB1YpmVGJnWyK+o3ifcV2grGNZkOnGf3Go+kB1PKkDJVhM1SLLfhw2O7KBy8sunY0KAlEdaGVU+HXgepdxZLsGr6vF7t3mtDgwqlHPDyRPiNDgrvHulZAm47RRLEVnWUU+s/ddA9UyOm4JaSXmjxez46nGujUEaYyJJABNORGE206CKXOg54s1bmpuQVVC8VBGy0mK9mg9M+tvF2POOoJ6juT0ZZT/Gru/gw9nhFkag7gwlH08cf7jh6YqDODp+tlla8QMdS2fEfeSA4KTuERI/haMaZkeFU8dgQ83kWrp9Oq/p3bS9LqJt4+rbLJe8BHTa5qsl1mDur5C4hoTxoE6qs/vhYK1H8uNseFD6EqkTD+eEVX8UkkgKNve9F5BmwKIPo4pe02ZaufTLxCH4BPJK2f4nbdqPMUFW5l5QbW1JL1ZfGgpsZL1nkfdMyySTN6/mFZ89KsQTU41NF9zwgrj0/BAwwYVgn8s+E15JgVevESHir+jaudYmAFYMX2fveLeHGQAWMwBMFArHlFUpI4tRPJgpHqJOALO2XK+kb8ztgeHZwPtdrDHZNCGd3kO6oj6XIMwsNoQKmatzJ4NqghIbmG69r1cGupFo6jGoVfxz4NTtv8H/Aji+DRDiEqEwhmpar7VTN1B9Diu0rootmxmUHTEoyErTXDaE8Fp6/LXpvqmGLoK4phxgx+6Z1LKRkpJxI2iPpIEPflU390SwXkInHdsmPOXKx/2YPebHq5Wc3e7jxqls2ly3Td0QlNrwgSSB5C/XQZBpJrUFeEczo0vzJ9MZIodv3JhJTanfpe0aTNU3VMTVQEGFHpIqDXGStcQi+x6YIGZDX9XR0FhIbrozSUg0c8hCmdJRKZOrsxLdH888/1XZCm5GgoZTzlZaZg6DwdTYzn9QKAaEHPbKGv9jWE8Meh0iAe4DS+KmUpYVtfJqhKLIwOVeYe4AJ7Pv6e6mW1nMpo9sO/fcJnUbtkIx0cKKDsGDkRiRC4ZSlZ3Gsj6Bwx5Ptf8raod044VfF2+BiyP9SQIkh4B/hLsz35eWpHbYBkuXveOEIVGiGDHo9TS/V0t02uKRbtCovnKGG9A30hQ6CNCUQhA1cM/W8zv9dvkedcw8tzg5bUM3BlUNexTPPX9styDr9R/Yt2lWRMxID6iwiMDj5iFCac7Tsbw6UHkcIpZ5h9qMQrBQ6wf1etTZBdV+CSQD5fF7Hc20VB4GvX75KkORPpAlPQIAudf7EiNEDFa/yxs+06gUnlDqdL2tUWj+rm7H1KcrWEfB9g6mK0jRmvrwmYUqXX1v3eVhgUsOh0icLfKlGYsdPsvKuyawvPVCjwESlXgJI3cNY5HifBXBcKwM1MyGimreyVUVM3OPs5lH7qsTPb1S73zQoB4RCWNWgp2gpnRgwz8a7Cjn61j7eJe2e1u4DMJsn6hxgBYCDtC77MJ0Q33Q9x5sROTo9hIsuHfOKZGSYFflqVcgHiGDVJhSCo1ebk0rGjtJsss4QIvNDieJSrUqO9UMX7Gd0VIeHyQpU+9ztMZke89Tud0Du+eRiKbNZb3VGN7bbHICep9Hu6bKzT4BHQiCh2ePE2vxR90ZnDArBgivXzW3kOEyGIcZzMuCbfT6JmX6QxuD7vYmGK4egavUQkaf6BcdZhanOlwQUHyxcm8KhiuA/TF6uGrSN8p/u5AjJXvOI9j0/BUn1Ak92mtLlfT4ywKL3DBogjNwo5RPA/+DFAkDdOliNyZsWZQqhY22pomH4plG/W5hXiuMFg3SNIKVGMpIxRAZiN7aGFZBorK2I74sgYlpD/1Jm8zMRYSnZKzd4XfhhcYhQ4LFqj9DvuIlXWZRz6Gh9i/38o5pE3/KJWxKJvNYAEZrl9b3+ZIS/hatjbb1D1nIQodnFgOtc1VeT86nDALtZ0QarEKgOs6Du3uwm8eP4LVidB6RZLuWdKqWogZydMsip7EEmpc9b4suFGhzNSEmxVRYUoen/cAut7TNAO4uZwhyesqiFRWSiJxE3xgPImtOzO7r/IyMDznJkN0EtE2F2XlanNkzKJP/A/qMje30eCkpubYgkIUtg9Gs37swQAhsAXwSZ9i8+sqNNea9GSsf/EVdswA+86YsvaAzlqx3JvO9iyr8RfhFUu0LmYaB2AIGWKTA52zJmC2jx/MgueBVJmUxPZxppYcbE2pQOPz9wYHNs2+zQBCmQ3hwDqPezaZU8s4HzhvfTPGxCRlLWziRCZw71U65m5vFm1qL7idddQMAN2IWLZG324cwt3UsO3f4xCJkrstedNm3xryt8cjvXckkBDF7EeL14q2oIPEqZI296V9SQSEK6w/VI/y0HwlHZsOColZQJfBuQVfwlvv1LDIo9ZZ5hMZ8T1wSL/cNHfRfaRMJe+L4KNqcAjYco83lnVuKhLrV8yAYFW9nobl9BHs6hmq0OGWOkrDWCF+pZ8GKXXuLXENxAiWgdirN92LXOS53f7pBY5Yo3hvH+NmRc2uOgoyWM+eB+YGyWETYMEi3y62T7FQ2MwC2q/tFX9MzGvcN7psbHmTuhZ0/WgBUhxnBAeKYnHbizhNFNRTJYXcayfx4odYxvCBREwR7q+Q0Twdd+sqZjbLON+mIO7AuatoSZVBTwy8cxe/zI/NGKyTn0xleuFktuAsJ4biapKLF6O7PvQHRe4714SGYdYd07T2MfPU5i5Y2sZoFN2rJeZTMhZq2Gcm3UraNHwYxCxEGhEvr7ZF0Q0lE/9Uf0QqWroiH9k2eSJc0sIk7r7ApQHIe4xzGOixJhihyA/iom1cjYGpb0hOdZvxfsJ41s5VbjO+hupL22vwO1XHEsWMqReohCD832vNVd7naB9/SOIh2Eju1VZYeS6Tn1lYyf19wLh3Btj7p+KjMNZePxfNTHdQDuyQoMKCLdr3EUF6pRGog6OA7H3vat3hf2bKFMICq58YSfgTv9trcZhdkhavUhqAQxBOCaWMuFE8B7QJ9OfoskRmynyTNlSEA4T129wUJaDrYVUwd8ngiypZa90TnsimlnW18rbVoH8DB/Aszi0zM6Ma0/ObNCZZxIUJuF8tTquKSq9lnOvOxPPVu4TpZtEjHWsijAlnwmrC3wg80BtXkgrk6/fBHmiJ9bAIkuLi5cxUzcZ776nlT1Qvkp7LCY5lkXw33md+8Y+5MHtz8PkNkoOUFdEzSvqwWMmAvYmU0Xmy9gDPdePwg297cdppm8xfC34eylJj4YyCDHGrbryHSoQwsec57ykLjQ6WCTA1i8nZxSc8bJt/JYil907cv3qkv//buHNh0NDRQezv2WxTnnCk/EFLzxHi+66KfuEY3C4Ol9IAsDMCWFUGUqZ/xz2IjxIwAdCe2J4dD652+ZLXTPcb1J3mFJBIsjWfzLwm/ToDWPwFgH8c0m+6xmaEzwKU/q3gMs464p4VSCyTYQsgSsobA7Y4Msabqv+coOQzapy+GjoG3GOz1dRyXPW4o8Lj8ON5RJrHdgI+7LvtWWYuujUDXy7Derlvis+/kyGzrNZNOIlJ7J58TWAeFbcoU8eOwgF5EfDaI3IwnNh86uBanBOzJcPNSNys/Qeenk4zKxF4YWFT4dCg0INeRHGIs5tuDm+SqvHDLAEcznDwTgNSc6OtOskqh7Sjh82YnHYGYsSf24fdaJkLHBEYHrYOyu2kx43FkeeZrknzSur4ClJBP9bM6ig+CSDrOL7WxgSbOKb5mPINzXjZHrg2tU1JJW3tXP1NNHjecglYSq2G8cflS5Fcsdi7yJb4lJ2agbKIL7dx8E1KqhdsaJwISjarly0SfwACe9toxSMRIV81hhGee/dGymoA/vtLngAj5x6giv94H2FMoP4gVH3AlY2oYDBraRud3p3RUcsl5dGGXpHYC0KDxkrUM4juzjHa5NTtdnkOwOhr8h8Pkg2HRqKAiZ/a4h7gGo2ebsw6JtyUuPREE/Bgxz7ZVDcLWN0zqvJCYyvpFPDuebUngXsdm3QA8EwAD6W4oHTVqsejCSuCi6th9sq4mgZKOk9mCu9dExg7M2R4nnuBhrdU0wW7NaCP5T3BJLXPmDoghFD3d11z+2AWqDfsYTFCwOve9lkuNkCcZm09tzV+2PiMUFNh/M4INuRu6GKykyejNxdmYOkDal31oAhKlZBZNdGswSAhdzbM8NOP8eZ50IxA6AFaXSKPcRWGQAoYpgQkmS5DNQZ9xlT447GhtzaRRjsVUNBpRdksre/zOAhJYvyWSh6D/dJ5HLW9/l1Y0Pkf4m78k0sjFjSC9aRNLt4ztaZqSUnWPpJ1GH4wSZG0W/IbPGKASkdULkrnnD/uf+y8E6Yun2/DNM2BrzGsee/T+gemGpTEZXc2UguBOpU8rZwVAAnBr6Qs+wTkd4uoFV4MprJFj8vQywtm1A3+G8KbxEiUekEWYZVwltsPHaLDdvifycRd3CRnSr7jTpqhXv7l4h36KcPi7qJIMMU5hQsz2jpRmv+abUrnRpgpn6iltysVcRFq5Y2w3tZ0DfkVBOUjAWauPzoLT9PbYEFs006GfsYRQv9yBoJ/HsjxhK8nzWcUsdHrI8Fq10aINCkHwIwybTW/3KjiqQ5urCaxnA7DLq5nmTFxskeORWci9Ad3hbVAvPnIRh5KxJKWOFF5J+hk7tCtbQs7vRkUc7p+DRbMKZg2CLkojNcazqM0u/07YKKGP3EXWrjSnIStfgvC9Bb7bB7mut5uU33Rr7ghY7d3ZUdXC6kDo2NctWIfpLD8207ceiH7ZaPveE8dgfQOUV0i3oElVd1Aw2WlbV0S6oxbkiqFdRc+fwyw+1Gju0l/jK5wu9Hfduo+dgAR1oYTxWja2IWuYduCFrOf7mMxSD4VY8nRMFO8GkEKeXuzO/EtaChpm32nbPoP2wlfgM83Y1xXGgdbqJTkElfhDd3bhHiHtNeK4yzPj4tpI19/mY9EvxAo2N19rYA6COHhy4blPf1XthFF0kOvL2/in/XcvwG1osgA5twCL8jyzPw1h7DMedfQ5p2n8OnB3aT5vt9Oo71OjM0S9wFNndAohcsWYs80W3O6C77XLrUzykzgXIOtiF5mcXk2jttZxATHk+iBa3Cl9TH7FgYdGP2sIe4MKL6AQq9CyL3BQh0FyN2POpBhsKbBsGiVY9H00aXq5qeUAZQ5hGzaFOR5zMqocEFD0BOg7x7mZgXT8D/B7ihYop/71T/cts88+oDis5hetCHjFQAUarRcJ/0SxXwq59cG1zjgzpCBbx/5k2brwWscDREV2wckcjQW7r+cju+5CW8Y2F8hCOtPKpIFWq2DB6LcAvlMMgQWADcQ4EMgwgB+WgAAAAA=",
    description: "Convite físico em formato de caixinha livro com arte personalizada.",
  },
  {
    id: "lousinha",
    name: "Lousinha Mágica",
    price: 7.2,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1Tj_lgRhYOgP3xFau7R9-n2h6W-uoFMPm",
    description: "Lousinha personalizada para divertir as crianças durante e depois da festa.",
    featured: true,
  },
  {
    id: "cofrinho",
    name: "Cofrinho",
    price: 5.4,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1MrnGWtuCaWJ83BdWGavyebH1sqTSL2Ps",
    description: "Cofrinho personalizado com nome, idade e identidade visual do evento.",
  },
  {
    id: "livro-colorir",
    name: "Livro de Colorir",
    price: 7.2,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1ZU08-pO4_cyKRUUs1p3MrLBtNwZJsM-K",
    description: "Livro de atividades para colorir, personalizado para a comemoração.",
  },
  {
    id: "canudo",
    name: "Caixa Canudo",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "11X3KxDmc8cy8qRTuI9c9r7CCUsjsQhxj",
    description: "Caixinha alta e temática para compor kits e lembrancinhas personalizadas.",
  },
  {
    id: "sextavada",
    name: "Caixinha Sextavada",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "13vdfL1sopJu8yUrEVqf0Tmy3K5IjgxMl",
    description: "Caixinha sextavada com acabamento personalizado no tema da festa.",
  },
  {
    id: "convite-digital",
    name: "Convite Digital",
    price: 18,
    unit: "arte",
    category: "Convites",
    imageId: "data:image/webp;base64,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",
    description: "Convite digital personalizado para envio por WhatsApp e redes sociais.",
    featured: true,
  },
];

export function personalizadoImage(imageId?: string, width = 900) {
  if (!imageId) return "";
  if (/^data:/i.test(imageId)) return imageId;
  if (/^https?:\/\//i.test(imageId)) return imageId;
  return `https://drive.google.com/thumbnail?id=${imageId}&sz=w${width}`;
}

export function formatPersonalizadoPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
