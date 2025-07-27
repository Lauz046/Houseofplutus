package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/cors" // ✅ Make sure this is imported

	"plutus-backend/graph"
	"plutus-backend/graph/generated"

	"encoding/json"
	"sync"
	"time"

	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	_ "github.com/lib/pq"
)

const defaultPort = "8090"

var (
	menuCache      []byte
	menuCacheMutex sync.RWMutex
	menuCacheTime  time.Time
	menuCacheTTL   = 10 * time.Minute

	// Search cache
	searchCache      map[string][]byte
	searchCacheMutex sync.RWMutex
	searchCacheTime  time.Time
	searchCacheTTL   = 5 * time.Minute
)

func getAllBrands(db *sql.DB, table string) []string {
	rows, err := db.Query("SELECT DISTINCT brand FROM " + table)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var brands []string
	for rows.Next() {
		var brand string
		if err := rows.Scan(&brand); err == nil {
			brands = append(brands, brand)
		}
	}
	return brands
}

func getAllSubcategories(db *sql.DB, table string) []string {
	rows, err := db.Query("SELECT DISTINCT subcategory FROM " + table)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var subcats []string
	for rows.Next() {
		var subcat string
		if err := rows.Scan(&subcat); err == nil {
			subcats = append(subcats, subcat)
		}
	}
	return subcats
}

func getAllGenders(db *sql.DB, table string) []string {
	rows, err := db.Query("SELECT DISTINCT gender FROM " + table)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var genders []string
	for rows.Next() {
		var gender string
		if err := rows.Scan(&gender); err == nil {
			genders = append(genders, gender)
		}
	}
	return genders
}

func getAllFragranceFamilies(db *sql.DB) []string {
	rows, err := db.Query("SELECT DISTINCT fragrance_family FROM perfumes")
	if err != nil {
		return nil
	}
	defer rows.Close()
	var fams []string
	for rows.Next() {
		var fam sql.NullString
		if err := rows.Scan(&fam); err == nil && fam.Valid {
			fams = append(fams, fam.String)
		}
	}
	return fams
}

func getProducts(db *sql.DB, table string, fields string, limit int) []map[string]interface{} {
	query := "SELECT " + fields + " FROM " + table + " LIMIT $1"
	rows, err := db.Query(query, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	var products []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		valPtrs := make([]interface{}, len(cols))
		for i := range vals {
			valPtrs[i] = &vals[i]
		}
		if err := rows.Scan(valPtrs...); err == nil {
			prod := map[string]interface{}{}
			for i, col := range cols {
				v := vals[i]
				if col == "images" {
					if arr, ok := v.([]string); ok {
						prod[col] = arr
					} else if s, ok := v.(string); ok {
						prod[col] = parsePgArrayString(s)
					} else if b, ok := v.([]byte); ok {
						prod[col] = parsePgArrayString(string(b))
					} else {
						prod[col] = []string{}
					}
				} else {
					b, ok := v.([]byte)
					if ok {
						prod[col] = string(b)
					} else {
						prod[col] = v
					}
				}
			}
			products = append(products, prod)
		}
	}
	return products
}

func getProductsByIndexes(db *sql.DB, table string, fields string, indexes []int) []map[string]interface{} {
	query := "SELECT " + fields + " FROM " + table
	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	var allProducts []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		valPtrs := make([]interface{}, len(cols))
		for i := range vals {
			valPtrs[i] = &vals[i]
		}
		if err := rows.Scan(valPtrs...); err == nil {
			prod := map[string]interface{}{}
			for i, col := range cols {
				v := vals[i]
				if col == "images" {
					if arr, ok := v.([]string); ok {
						prod[col] = arr
					} else if s, ok := v.(string); ok {
						prod[col] = parsePgArrayString(s)
					} else if b, ok := v.([]byte); ok {
						prod[col] = parsePgArrayString(string(b))
					} else {
						prod[col] = []string{}
					}
				} else {
					b, ok := v.([]byte)
					if ok {
						prod[col] = string(b)
					} else {
						prod[col] = v
					}
				}
			}
			allProducts = append(allProducts, prod)
		}
	}
	var fixed []map[string]interface{}
	for _, idx := range indexes {
		if idx >= 0 && idx < len(allProducts) {
			fixed = append(fixed, allProducts[idx])
		}
	}
	return fixed
}

func menuHandler(w http.ResponseWriter, r *http.Request) {
	menuCacheMutex.RLock()
	if time.Since(menuCacheTime) < menuCacheTTL && menuCache != nil {
		defer menuCacheMutex.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		w.Write(menuCache)
		return
	}
	menuCacheMutex.RUnlock()

	db := globalDB // use the global DB connection

	menuData := map[string]interface{}{
		"sneaker": map[string]interface{}{
			"brands":   getAllBrands(db, "sneakers"),
			"products": getProductsByIndexes(db, "sneakers", "id, brand, product_name, images, product_link", []int{2, 4, 6, 8, 10, 13, 15, 16, 20}),
		},
		"apparel": map[string]interface{}{
			"brands":        getAllBrands(db, "apparel"),
			"subcategories": getAllSubcategories(db, "apparel"),
			"genders":       getAllGenders(db, "apparel"),
			"products":      getProductsByIndexes(db, "apparel", "id, brand, product_name, images, product_link, gender, subcategory", []int{1, 2, 3, 4, 5, 6}),
		},
		"watch": map[string]interface{}{
			"brands":   getAllBrands(db, "watches"),
			"genders":  getAllGenders(db, "watches"),
			"products": getProductsByIndexes(db, "watches", "id, brand, name, images, link, gender", []int{1, 2, 3, 4, 5, 6}),
		},
		"perfume": map[string]interface{}{
			"brands":            getAllBrands(db, "perfumes"),
			"subcategories":     getAllSubcategories(db, "perfumes"),
			"fragranceFamilies": getAllFragranceFamilies(db),
			"products":          getProductsByIndexes(db, "perfumes", "id, brand, title, images, url, fragrance_family, subcategory", []int{1, 2, 3, 4, 5, 6}),
		},
		"accessories": map[string]interface{}{
			"brands":        getAllBrands(db, "accessories"),
			"subcategories": getAllSubcategories(db, "accessories"),
			"genders":       getAllGenders(db, "accessories"),
			"products":      getProductsByIndexes(db, "accessories", "id, brand, product_name, images, product_link, gender, subcategory", []int{1, 2, 3, 4, 5, 6}),
		},
	}
	b, err := json.Marshal(menuData)
	if err != nil {
		http.Error(w, "Failed to marshal menu", http.StatusInternalServerError)
		return
	}
	menuCacheMutex.Lock()
	menuCache = b
	menuCacheTime = time.Now()
	menuCacheMutex.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

func corsHandlerFunc(h http.HandlerFunc) http.Handler {
	return cors.New(cors.Options{
		AllowedOrigins: []string{
			"*", // Allow all origins

		},
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Content-Length", "Content-Type"},
		MaxAge:           86400, // 24 hours
		Debug:            true,  // Enable debug logging
	}).Handler(http.HandlerFunc(h))
}

var globalDB *sql.DB

func main() {
	// Load .env file if it exists, but don't fail if it doesn't
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️ Warning: .env file not found, using environment variables from deployment platform")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	dbURL := os.Getenv("NEON_DB_URL")
	if dbURL == "" {
		log.Fatal("❌ NEON_DB_URL is not set in environment variables")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to DB: %v", err)
	}
	defer db.Close()

	// Create indexes for faster queries
	createIndexes(db)

	globalDB = db // set global DB for menuHandler

	resolver := &graph.Resolver{DB: db}
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))

	// ✅ Add CORS here with more explicit configuration
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{
			"*", // Allow all origins

		},
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Content-Length", "Content-Type"},
		MaxAge:           86400, // 24 hours
		Debug:            true,  // Enable debug logging
	}).Handler(srv)

	http.Handle("/query", corsHandler)                         // ✅ CORS applied here
	http.Handle("/api/menu", corsHandlerFunc(menuHandler))     // CORS for menu
	http.Handle("/api/search", corsHandlerFunc(searchHandler)) // CORS for search
	http.Handle("/", playground.Handler("GraphQL Playground", "/query"))

	log.Printf("🚀 Server running at http://localhost:%s/", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func createIndexes(db *sql.DB) {
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_sneakers_brand ON sneakers(LOWER(brand))",
		"CREATE INDEX IF NOT EXISTS idx_sneakers_brand_product_name ON sneakers(LOWER(brand), LOWER(product_name))",
		"CREATE INDEX IF NOT EXISTS idx_watches_brand ON watches(LOWER(brand))",
		"CREATE INDEX IF NOT EXISTS idx_perfumes_brand ON perfumes(LOWER(brand))",
		"CREATE INDEX IF NOT EXISTS idx_accessories_brand ON accessories(LOWER(brand))",
		"CREATE INDEX IF NOT EXISTS idx_apparel_brand ON apparel(LOWER(brand))",
	}

	for _, index := range indexes {
		_, err := db.Exec(index)
		if err != nil {
			log.Printf("⚠️ Warning: Failed to create index: %v", err)
		} else {
			log.Printf("✅ Created index for faster queries")
		}
	}
}

// Helper to parse Postgres array string (e.g. {url1,url2}) into []string
func parsePgArrayString(s string) []string {
	s = strings.Trim(s, "{}")
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")

	if query == "" && category == "" {
		// Return default products
		db := globalDB
		menuData := map[string]interface{}{
			"products": []map[string]interface{}{
				// Get first 10 products from each category
			},
			"categoryCounts": map[string]int{
				"sneakers":    getProductCount(db, "sneakers"),
				"apparel":     getProductCount(db, "apparel"),
				"accessories": getProductCount(db, "accessories"),
				"perfumes":    getProductCount(db, "perfumes"),
				"watches":     getProductCount(db, "watches"),
			},
		}

		b, err := json.Marshal(menuData)
		if err != nil {
			http.Error(w, "Failed to marshal search results", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(b)
		return
	}

	// Check cache first
	cacheKey := query + ":" + category
	searchCacheMutex.RLock()
	if time.Since(searchCacheTime) < searchCacheTTL && searchCache != nil {
		if cached, exists := searchCache[cacheKey]; exists {
			defer searchCacheMutex.RUnlock()
			w.Header().Set("Content-Type", "application/json")
			w.Write(cached)
			return
		}
	}
	searchCacheMutex.RUnlock()

	db := globalDB
	var results []map[string]interface{}

	if category != "" {
		// Search within specific category
		results = searchInCategory(db, category, query)
	} else {
		// Search across all categories
		results = searchAllCategories(db, query)
	}

	response := map[string]interface{}{
		"products": results,
	}

	b, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Failed to marshal search results", http.StatusInternalServerError)
		return
	}

	// Cache the results
	searchCacheMutex.Lock()
	if searchCache == nil {
		searchCache = make(map[string][]byte)
	}
	searchCache[cacheKey] = b
	searchCacheTime = time.Now()
	searchCacheMutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

func searchInCategory(db *sql.DB, category, query string) []map[string]interface{} {
	table := category
	fields := "id, brand, product_name, images, product_link"

	if category == "watches" {
		fields = "id, brand, name, images, link"
	} else if category == "perfumes" {
		fields = "id, brand, title, images, url"
	}

	// Use ILIKE for case-insensitive search
	sqlQuery := "SELECT " + fields + " FROM " + table + " WHERE brand ILIKE $1 OR product_name ILIKE $1 OR name ILIKE $1 OR title ILIKE $1 LIMIT 50"

	rows, err := db.Query(sqlQuery, "%"+query+"%")
	if err != nil {
		return nil
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		// Scan based on category
		var result map[string]interface{}
		// Implementation depends on the specific fields for each category
		results = append(results, result)
	}

	return results
}

func searchAllCategories(db *sql.DB, query string) []map[string]interface{} {
	// Search across all categories and combine results
	allResults := []map[string]interface{}{}

	categories := []string{"sneakers", "apparel", "accessories", "perfumes", "watches"}
	for _, category := range categories {
		results := searchInCategory(db, category, query)
		allResults = append(allResults, results...)
	}

	// Limit total results
	if len(allResults) > 50 {
		allResults = allResults[:50]
	}

	return allResults
}

func getProductCount(db *sql.DB, table string) int {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count)
	if err != nil {
		return 0
	}
	return count
}
