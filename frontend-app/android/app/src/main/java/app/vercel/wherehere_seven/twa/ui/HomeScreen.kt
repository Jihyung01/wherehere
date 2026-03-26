package app.vercel.wherehere_seven.twa.ui

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// 더미 데이터 클래스
data class PlaceItem(
    val id: Int,
    val title: String, 
    val description: String 
)

// 화면 최상단 컴포저블
@Composable
fun HomeScreen() {
    val dummyData = listOf(
        PlaceItem(
            id = 1,
            title = "Place Title 1 [여기에 카드1 제목 복붙]",
            description = "Place Description 1 [여기에 카드1 설명 복붙]"
        ),
        PlaceItem(
            id = 2,
            title = "Place Title 2 [여기에 카드2 제목 복붙]",
            description = "Place Description 2 [여기에 카드2 설명 복붙]"
        ),
        PlaceItem(
            id = 3,
            title = "Place Title 3 [여기에 카드3 제목 복붙]",
            description = "Place Description 3 [여기에 카드3 설명 복붙]"
        )
    )

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            
            // 상단 타이틀 구역
            Text(
                text = "Screen Main Title [여기에 메인 타이틀 복붙]",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Screen Subtitle [여기에 서브 타이틀 복붙]",
                fontSize = 14.sp,
                color = Color.Gray,
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(24.dp))

            // 3개의 카드 리스트
            dummyData.forEach { item ->
                PlaceCard(item)
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

// 개별 카드 컴포저블
@Composable
fun PlaceCard(item: PlaceItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 회색 박스 (썸네일 Placeholder)
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.LightGray)
            ) {
                // Image Placeholder Text [여기에 '이미지 없음' 등 표시 가능]
                Text(
                    text = "IMG",
                    color = Color.DarkGray,
                    modifier = Modifier.align(Alignment.Center),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // 텍스트 영역
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = item.title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = item.description,
                    fontSize = 14.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

// 실시간 확인용 Preview (Light Theme)
@Preview(showBackground = true, name = "Light Mode")
@Composable
fun HomeScreenPreviewLight() {
    MaterialTheme {
        HomeScreen()
    }
}

// 실시간 확인용 Preview (Dark Theme)
@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES, name = "Dark Mode")
@Composable
fun HomeScreenPreviewDark() {
    MaterialTheme {
        HomeScreen()
    }
}
