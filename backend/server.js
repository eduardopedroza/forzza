const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { PORT } = require("./config");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const { authenticateSupabase } = require("./middleware/auth");
const axios = require("axios");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const carriers = [
  "fedex",
  "dhl",
  "redpack",
  "paquetexpress",
  "noventa9Minutos",
  "ivoy",
  "ups",
  "estafeta",
  "quicken",
];

const mexicoStateCodes = {
  Aguascalientes: "AG",
  "Baja California": "BC",
  "Baja California Sur": "BS",
  Campeche: "CM",
  Chiapas: "CS",
  Chihuahua: "CH",
  Coahuila: "CO",
  Colima: "CL",
  Durango: "DG",
  Guanajuato: "GT",
  Guerrero: "GR",
  Hidalgo: "HG",
  Jalisco: "JA",
  "Mexico City": "DF",
  "Mexico State": "EM",
  Michoacán: "MI",
  Morelos: "MR",
  Nayarit: "NA",
  "Nuevo León": "NL",
  Oaxaca: "OA",
  Puebla: "PU",
  Querétaro: "QT",
  "Quintana Roo": "QR",
  "San Luis Potosí": "SL",
  Sinaloa: "SI",
  Sonora: "SO",
  Tabasco: "TB",
  Tamaulipas: "TM",
  Tlaxcala: "TL",
  Veracruz: "VE",
  Yucatán: "YU",
  Zacatecas: "ZA",
};

const app = express();

app.use(morgan("combined"));
app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

app.get("/", (req, res, next) => {
  res.send("Hello I am working my friend Supabase <3");
});

app.get("/auth/session", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/register", async (req, res, next) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Email format validation
  const emailRegex = /^\w+@[a-zA-Z_\.]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  // Password length validation
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create a session for the user
    const { session, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    return res.status(201).json({ data, session });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

app.post("/auth/login", async (req, res, next) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: "Logged out successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/user-info", async (req, res, next) => {
  const {
    firstName,
    lastName,
    phone,
    streetNumber,
    streetName,
    colony,
    city,
    state,
    postalCode,
  } = req.body;

  const user = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    // Check if user exists first

    const userId = user.data.user.id;

    // Check if user exists first
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!existingUser?.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {
      first_name: firstName ? firstName : null,
      last_name: lastName ? lastName : null,
      phone: phone ? phone : null,
      street_number: streetNumber ? streetNumber : null,
      street_name: streetName ? streetName : null,
      colony: colony ? colony : null,
      city: city ? city : null,
      state: state ? state : null,
      postal_code: postalCode ? postalCode : null,
    };

    const { data, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ data });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

app.get("/auth/user-info/:userId", async (req, res, next) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data?.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(data);
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

app.get("/products", async (req, res) => {
  try {
    const { data, error } = await supabase.from("Products").select("*");
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/products/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const { data, error } = await supabase
      .from("Products")
      .select("*")
      .eq("id", productId)
      .single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/product-details/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const { data, error } = await supabase
      .from("ProductDetails")
      .select("*")
      .eq("product_id", productId);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

async function getQuote(carrier, quotationRequest) {
  quotationRequest.shipment.carrier = carrier;
  try {
    const response = await axios.post(
      "https://api-test.envia.com/ship/rate/",
      quotationRequest,
      {
        headers: {
          Authorization: `Bearer ${process.env.ENVIA_TEST_TOKEN}`,
        },
      }
    );

    return response.data; // Return the entire response data
  } catch (error) {
    console.error(
      `Failed to get quote for carrier ${carrier}: ${error.message}`
    );
    return { error: `Failed to get quote for carrier ${carrier}` };
  }
}

// Route to get the cheapest quotes
app.post("/shipments/cheapest-quote", async (req, res) => {
  const quotationRequest = {
    origin: {
      name: process.env.ORIGIN_NAME,
      company: process.env.ORIGIN_COMPANY,
      email: process.env.ORIGIN_EMAIL,
      phone: process.env.ORIGIN_PHONE,
      street: process.env.ORIGIN_STREET,
      number: process.env.ORIGIN_NUMBER,
      district: process.env.ORIGIN_DISTRICT,
      city: process.env.ORIGIN_CITY,
      state: process.env.ORIGIN_STATE,
      country: process.env.ORIGIN_COUNTRY,
      postalCode: process.env.ORIGIN_POSTAL_CODE,
      reference: "",
      coordinates: {
        latitude: "",
        longitude: "",
      },
    },
    destination: {
      name: req.body.name,
      company: "",
      email: req.body.email,
      phone: req.body.phone,
      street: req.body.streetName,
      number: req.body.streetNumber,
      district: req.body.colony,
      city: req.body.city,
      state: mexicoStateCodes[req.body.state],
      country: "MX",
      postalCode: req.body.postalCode,
      reference: "",
      coordinates: {
        latitude: "",
        longitude: "",
      },
    },
    packages: [
      {
        content: "Pantalones",
        amount: 1,
        type: "box",
        weight: 0.6,
        insurance: 0,
        declaredValue: 0,
        weightUnit: "KG",
        lengthUnit: "CM",
        dimensions: {
          length: 40,
          width: 10,
          height: 50,
        },
      },
    ],
    shipment: {
      carrier: "fedex",
      type: 1,
    },
    settings: {
      currency: "MXN",
    },
  };

  // return res.status(200).json({ quotationRequest });

  try {
    const quotes = await Promise.all(
      carriers.map((carrier) => getQuote(carrier, quotationRequest))
    );

    const flattenedQuotes = quotes
      .filter((response) => response.meta === "rate") // Only include successful rate responses
      .flatMap((response) => response.data); // Extract the data array from each response

    if (flattenedQuotes.length === 0) {
      return res.status(500).json({ error: "Failed to get any quotes" });
    }

    flattenedQuotes.sort((a, b) => a.totalPrice - b.totalPrice);
    const topQuotes = flattenedQuotes.slice(0, 4);

    return res.json(topQuotes);
  } catch (error) {
    console.error(`Error getting quotes: ${error.message}`);
    return res.status(500).json({ error: "Failed to get quotes" });
  }
});

app.post("/shipments/create", async (req, res) => {
  const { carrier, service, totalPrice, userId } = req.body;

  const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId);

  const shipmentLabelRequest = {
    origin: {
      name: process.env.ORIGIN_NAME,
      company: process.env.ORIGIN_COMPANY,
      email: process.env.ORIGIN_EMAIL,
      phone: process.env.ORIGIN_PHONE,
      street: process.env.ORIGIN_STREET,
      number: process.env.ORIGIN_NUMBER,
      district: process.env.ORIGIN_DISTRICT,
      city: process.env.ORIGIN_CITY,
      state: process.env.ORIGIN_STATE,
      country: process.env.ORIGIN_COUNTRY,
      postalCode: process.env.ORIGIN_POSTAL_CODE,
      reference: "",
      coordinates: {
        latitude: "",
        longitude: "",
      },
    },
    destination: {
      name: userData.displayName,
      company: "",
      email: userData.email,
      phone: userData.phone,
      street: userData.streetName,
      number: userData.streetNumber,
      district: userData.colony,
      city: userData.city,
      state: mexicoStateCodes[userData.state],
      country: "MX",
      postalCode: userData.postalCode,
      reference: "",
      coordinates: {
        latitude: "",
        longitude: "",
      },
    },
    packages: [
      {
        content: "Pantalones",
        amount: 1,
        type: "box",
        weight: 0.6,
        insurance: 0,
        declaredValue: 0,
        weightUnit: "KG",
        lengthUnit: "CM",
        dimensions: {
          length: 40,
          width: 10,
          height: 50,
        },
      },
    ],
    shipment: {
      carrier: carrier,
      service: service,
      type: 1,
    },
    settings: {
      currency: "MXN",
    },
  };

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const response = await axios.post(
      "https://api-test.envia.com/ship/generate/",
      shipmentLabelRequest,
      {
        headers: {
          Authorization: `Bearer ${process.env.ENVIA_TEST_TOKEN}`,
        },
      }
    );

    const { data, error } = await supabase.from("shipments").insert([
      {
        user_id: user.id,
        carrier,
        service_id: serviceId,
        service_description: serviceDescription,
        total_price: totalPrice,
      },
    ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ data });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

app.post("/payments/create", async (req, res, next) => {
  const { email, first_name, last_name, phone, items, userId } = req.body;

  // Encode the credentials in Base64
  const basicAuth = Buffer.from(
    `${process.env.ECARTPAY_TEST_PUBTOKEN}:${process.env.ECARTPAY_TEST_PRIVTOKEN}`
  ).toString("base64");

  try {
    // Get the token with Basic Auth
    const tokenRes = await axios.post(
      "https://sandbox.ecartpay.com/api/authorizations/token",
      {},
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const token = tokenRes.data.token;

    const response = await axios.post(
      "https://sandbox.ecartpay.com/api/orders",
      {
        email,
        first_name,
        last_name,
        phone,
        currency: "MXN",
        redirect_url: "http://localhost:5173/verify-payment",
        items,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const paymentData = response.data;

    const { data, error } = await supabase.from("Payments").insert([
      {
        payment_id: paymentData.id,
        amount: paymentData.totals.total,
        status: paymentData.status,
        user_id: userId,
        pay_link: paymentData.pay_link,
        payment_token: token,
      },
    ]);

    if (error) {
      return res.status(408).json({ error: error });
    }

    return res.status(200).json({ paymentData, supabaseData: data });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create checkout" });
  }
});

app.post("/payments/data", async (req, res, next) => {
  const { userId } = req.body;

  try {
    // Retrieve the token from the database
    const { data: paymentData, error } = await supabase
      .from("Payments")
      .select("payment_id, payment_token")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!paymentData || paymentData.length === 0) {
      return res.status(404).json({ error: "No token found for the user" });
    }

    const token = paymentData[0].payment_token;
    const paymentId = paymentData[0].payment_id;

    const response = await axios.get(
      "https://sandbox.ecartpay.com/api/orders",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const payment = response.data.docs.find(
      (payment) => payment.id === paymentId
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.status(200).json({ payment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, function () {
  console.log(`Started on http://localhost:${PORT}`);
});
